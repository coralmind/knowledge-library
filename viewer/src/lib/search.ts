/**
 * Catalog search over labels, ids, definitions, claims, evidence quotes and
 * source details. Every word of the query must occur somewhere in the entry;
 * a match in the label counts far more than one in a quote. Retired entries
 * rank lower.
 */
import type { BrowseRow } from './browse';

export interface SearchField {
  /** Where the text is, as shown to the reader: "definition", "claim c2", "evidence quote, Source-29". */
  name: string;
  text: string;
  weight: number;
}

export interface SearchHit {
  row: BrowseRow;
  score: number;
  /** The heaviest field that matched. */
  field: SearchField;
  words: string[];
}

export function fieldsOf(row: BrowseRow): SearchField[] {
  const fields: SearchField[] = [
    { name: 'label', text: row.label, weight: 10 },
    { name: 'id', text: [row.display_id, row.id, ...row.aliases].join(' '), weight: 8 },
  ];
  if (row.type === 'source') {
    fields.push({ name: 'title', text: row.title ?? '', weight: 6 });
    fields.push({ name: 'authors', text: `${(row.authors ?? []).join(', ')} ${row.year ?? ''}`, weight: 5 });
  } else {
    fields.push({ name: 'definition', text: row.definition ?? '', weight: 4 });
    for (const c of row.claims) fields.push({ name: `claim ${c.id}`, text: c.text, weight: 2 });
    for (const q of row.quotes) fields.push({ name: `evidence quote, ${q.source}`, text: q.text, weight: 1 });
  }
  return fields;
}

export const queryWords = (q: string): string[] => q.toLowerCase().split(/\s+/).filter(Boolean);

const cache = new WeakMap<BrowseRow, { fields: SearchField[]; lower: string[]; all: string }>();

function indexed(row: BrowseRow) {
  let hit = cache.get(row);
  if (!hit) {
    const fields = fieldsOf(row);
    const lower = fields.map((f) => f.text.toLowerCase());
    hit = { fields, lower, all: lower.join(' \u0001 ') };
    cache.set(row, hit);
  }
  return hit;
}

export function matchRow(row: BrowseRow, words: string[]): SearchHit | null {
  if (words.length === 0) return null;
  const { fields, lower, all } = indexed(row);
  if (!words.every((w) => all.includes(w))) return null;
  let score = 0;
  let best: SearchField | null = null;
  fields.forEach((f, i) => {
    const hits = words.filter((w) => lower[i]?.includes(w)).length;
    if (hits === 0) return;
    score += f.weight * hits;
    if (!best || f.weight > best.weight) best = f;
  });
  if (!best) return null;
  if (row.status === 'deprecated') score *= 0.5;
  return { row, score, field: best, words };
}

/** Matching rows, best first. */
export function searchRows(rows: BrowseRow[], q: string): SearchHit[] {
  const words = queryWords(q);
  return rows
    .map((r) => matchRow(r, words))
    .filter((h): h is SearchHit => h !== null)
    .sort((a, b) => b.score - a.score);
}

export interface Snippet {
  before: boolean;
  after: boolean;
  /** Alternating plain and matched text; odd positions are matches. */
  parts: string[];
}

/**
 * A window of `text` around the first matched word, split so matches can be
 * marked. The window starts at most 30 characters before the match, so the
 * match stays in view on a line that is cut off at its end.
 */
export function snippet(text: string, words: string[], reach = 70): Snippet {
  const low = text.toLowerCase();
  let at = -1;
  for (const w of words) {
    at = low.indexOf(w);
    if (at >= 0) break;
  }
  let s = text;
  let before = false;
  let after = false;
  if (text.length > reach * 2) {
    const a = Math.max(0, at - Math.min(reach, 30));
    const b = Math.min(text.length, a + reach * 2);
    s = text.slice(a, b);
    before = a > 0;
    after = b < text.length;
  }
  const escaped = words.filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = escaped.length ? s.split(new RegExp(`(${escaped.join('|')})`, 'i')) : [s];
  return { before, after, parts };
}
