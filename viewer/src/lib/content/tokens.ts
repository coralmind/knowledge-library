/**
 * Resolves a `{{...}}` token in page content to a number counted from the
 * catalog. An unknown fact, function or entry id throws, so a page that
 * states a number about the catalog cannot build with a wrong one.
 *
 *   {{pathways.with_condition}}          a named fact, in digits
 *   {{ai_behaviors.irreversible|Word}}   as a capitalized word up to twenty
 *   {{entries(source)|about}}            rounded, after "about" or "roughly"
 *   {{share(standing.value, theorized)}} a share of entries, as a phrase
 *   {{field(pathway, mediators)|noun:pathway}}  with its noun: "1 pathway", "2 pathways"
 *
 * Functions: entries(type), field(type, name), uses(path, value),
 * share(path, value), into(impact id), candidates(behavior id),
 * rated(value, id, id, ...). `type` may be `*` for every kind but sources.
 */
import { FACT_DESCRIPTIONS, type Catalog } from '../catalog';
import { plainName } from '../glossary';
import { TYPE_LABELS, type EntryType } from '../types';

const WORDS =
  'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');

export interface ResolvedToken {
  text: string;
  /** What the number counts, for its hover text. */
  description: string;
}

/** Round as a reader expects after "about": exact under 100, then to tens, then to fifties. */
export function approximate(n: number): number {
  if (n < 100) return n;
  const step = n < 1000 ? 10 : 50;
  return Math.round(n / step) * step;
}

export function sharePhrase(r: number): string {
  if (r > 0.7) return 'most';
  if (r > 0.62) return 'about two thirds';
  if (r > 0.53) return 'more than half';
  if (r >= 0.45) return 'about half';
  if (r >= 0.38) return 'less than half';
  if (r >= 0.29) return 'about a third';
  if (r >= 0.2) return 'about a quarter';
  return 'a few';
}

/** The plural of a noun written in the singular: "entry" to "entries", otherwise an added "s". */
export const plural = (noun: string): string => (noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`);

export function formatCount(n: number, mods: string[]): string {
  const value = mods.includes('about') ? approximate(n) : n;
  let text = value >= 1000 ? value.toLocaleString('en-US') : String(value);
  if ((mods.includes('word') || mods.includes('Word')) && value <= 20) {
    const w = WORDS[value] ?? String(value);
    text = mods.includes('Word') ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }
  const noun = mods.find((m) => m.startsWith('noun:'))?.slice(5);
  return noun ? `${text} ${value === 1 ? noun : plural(noun)}` : text;
}

/** A kind of entry in the plural, lower case except "AI". */
const typeName = (t: string) =>
  t === '*' ? 'entries other than sources' : `${(TYPE_LABELS[t as EntryType] ?? t).replace(/^(?!AI\b)\S+/, (w) => w.toLowerCase())}s`;

function requireId(cat: Catalog, id: string | undefined): string {
  if (!id || !cat.byId.has(id)) throw new Error(`no entry ${id ?? '(missing)'}`);
  return id;
}

export function resolveToken(expr: string, cat: Catalog): ResolvedToken {
  const [callPart = '', ...modParts] = expr.split('|').map((s) => s.trim());
  const mods = modParts.filter(Boolean);
  for (const m of mods) if (!['word', 'Word', 'about'].includes(m) && !/^noun:[a-z ]+$/.test(m)) throw new Error(`unknown modifier "${m}" in {{${expr}}}`);

  const call = /^([a-z_.*]+)(?:\((.*)\))?$/.exec(callPart);
  if (!call) throw new Error(`cannot read {{${expr}}}`);
  const [, name = '', argText] = call;
  const args = argText === undefined ? [] : argText.split(',').map((a) => a.trim()).filter(Boolean);
  const label = (id: string) => cat.index.get(id)?.label ?? id;

  const count = (n: number, description: string): ResolvedToken => ({ text: formatCount(n, mods), description: `${description}: ${n.toLocaleString('en-US')}` });

  try {
    switch (name) {
      case 'entries': {
        const [type = ''] = args;
        if (type !== '*' && !(type in TYPE_LABELS)) throw new Error(`unknown entry type "${type}"`);
        return count(cat.pool(type).length, `Current ${typeName(type)}`);
      }
      case 'field': {
        const [type = '', field = ''] = args;
        return count(cat.field(type, field), `${typeName(type)} with ${field} filled in`.replace(/^./, (c) => c.toUpperCase()));
      }
      case 'uses': {
        const [path = '', value = ''] = args;
        return count(cat.uses(path, value), `Stored as ${value} in ${path}`);
      }
      case 'share': {
        const [path = '', value = ''] = args;
        const r = cat.uses(path, value) / Math.max(1, cat.facts['entries.nonsource'] ?? 1);
        return { text: sharePhrase(r), description: `${Math.round(r * 100)}% of entries other than sources are ${plainName('Standing', value) || value}` };
      }
      case 'into': {
        const id = requireId(cat, args[0]);
        return count(cat.into(id), `Current pathways that lead to ${label(id)}`);
      }
      case 'candidates': {
        const id = requireId(cat, args[0]);
        return count(cat.candidates(id), `Current pathways that ${label(id)} is a part of`);
      }
      case 'rated': {
        const [value = '', ...ids] = args;
        ids.forEach((id) => requireId(cat, id));
        return count(cat.rated(value, ids), `Of the entries named here, those rated ${plainName('Standing', value)}`);
      }
      default: {
        if (args.length > 0 || !(name in cat.facts)) throw new Error(`unknown fact "${name}"`);
        return count(cat.facts[name] ?? 0, FACT_DESCRIPTIONS[name] ?? name);
      }
    }
  } catch (err) {
    throw new Error(`Content token {{${expr}}}: ${(err as Error).message}`);
  }
}
