/**
 * Page content: the glossary covers every stored value, the Markdown reader
 * reads what content files use, and every number token is counted from the
 * catalog or fails loudly.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Catalog, type Entry } from '../src/lib/catalog';
import { parseDocument, walkInline } from '../src/lib/content/markdown';
import { approximate, formatCount, resolveToken, sharePhrase } from '../src/lib/content/tokens';
import { loadGlossary } from '../src/lib/glossary';
import { resolveSchemaDir } from '../src/lib/source';
import { titleCase } from '../src/lib/titlecase';
import { ENTRY_TYPES, type IndexRow } from '../src/lib/types';

type Def = { enum?: unknown[]; properties?: { kind?: { enum?: unknown[]; const?: unknown } } };

/**
 * Every stored vocabulary, by name: each enum in schema/'s `$defs`, plus the
 * two that schema/ spreads out instead of naming. `EntryType` is the viewer's
 * type table less `source`, which is a cited work rather than an entry and is
 * defined among the glossary's terms. `PartKind` is the `kind` of each `*Part`
 * definition.
 */
function vocabularies(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>([
    ['EntryType', new Set(ENTRY_TYPES.filter((t) => t !== 'source'))],
    ['PartKind', new Set()],
  ]);
  const add = (name: string, values: unknown[]) => {
    const set = found.get(name) ?? new Set<string>();
    values.forEach((v) => set.add(String(v)));
    found.set(name, set);
  };
  const dir = resolveSchemaDir();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.schema.json'))) {
    const defs = (JSON.parse(readFileSync(join(dir, file), 'utf-8')) as { $defs?: Record<string, Def> }).$defs ?? {};
    for (const [name, def] of Object.entries(defs)) {
      if (def.enum) add(name, def.enum);
      const kind = def.properties?.kind;
      if (name.endsWith('Part') && kind) add('PartKind', kind.enum ?? (kind.const === undefined ? [] : [kind.const]));
    }
  }
  return found;
}

describe('glossary', () => {
  it('gives every stored value a plain name, and names no value the schema lacks', () => {
    const enums = vocabularies();
    for (const list of loadGlossary().lists) {
      if (!list.vocabulary) continue;
      const want = enums.get(list.vocabulary);
      expect(want, `glossary list "${list.name}" names vocabulary ${list.vocabulary}, which schema/ does not define`).toBeDefined();
      const have = new Set(list.values.map((v) => v.value));
      const missing = [...(want ?? [])].filter((v) => !have.has(v));
      const extra = [...have].filter((v) => !want?.has(v));
      expect(
        { missing, extra },
        `content/glossary.yaml "${list.name}" must list exactly the ${list.vocabulary} values in schema/. A reader would otherwise see a raw stored value.`,
      ).toEqual({ missing: [], extra: [] });
    }
  });
});

describe('Markdown reader', () => {
  const doc = parseDocument(
    [
      '---',
      'title: Test',
      '---',
      '# Title',
      '<!-- Draft note: never rendered -->',
      '## Step 2. What happens next',
      'A {{entries(pathway)|word}} and [[kl-000001]].',
      ':::outer a b',
      ':::inner',
      '| A | B |',
      '| --- | --- |',
      '| {{uses(x, y)|about}} | [[kl-000002|named]] |',
      ':::',
      ':::',
    ].join('\n'),
  );

  it('reads front matter and drops comments', () => {
    expect(doc.meta.title).toBe('Test');
    expect(JSON.stringify(doc)).not.toContain('Draft note');
  });

  it('gives a step heading a step number and a stable id', () => {
    const step = doc.blocks.find((b) => b.kind === 'heading' && b.level === 2);
    expect(step).toMatchObject({ id: 'step-2', step: 2 });
  });

  it('nests containers and keeps a | inside a token or reference within its table cell', () => {
    const outer = doc.blocks.find((b) => b.kind === 'container');
    expect(outer).toMatchObject({ name: 'outer', args: ['a', 'b'] });
    const inner = outer?.kind === 'container' ? outer.children[0] : undefined;
    const table = inner?.kind === 'container' ? inner.children[0] : undefined;
    expect(table?.kind).toBe('table');
    if (table?.kind === 'table') expect(table.rows[0]).toHaveLength(2);
  });

  it('finds every token and reference, so a page can be checked before it renders', () => {
    const found = [...walkInline(doc.blocks)].filter((n) => n.kind === 'token' || n.kind === 'ref');
    expect(found.map((n) => (n.kind === 'token' ? n.expr : n.kind === 'ref' ? n.id : ''))).toEqual([
      'entries(pathway)|word',
      'kl-000001',
      'uses(x, y)|about',
      'kl-000002',
    ]);
  });
});

describe('counted numbers', () => {
  const entry = (id: string, type: Entry['type'], extra: Record<string, unknown> = {}): Entry => ({ id, type, label: id, ...extra });
  const entries: Entry[] = [
    entry('kl-000001', 'pathway', {
      body: { composition_parts: [{ id: 'kl-000003', kind: 'context_value', role: 'condition' }], impacts: [{ impact: 'kl-000002', sign: 'harmful' }] },
      standing: { value: 'theorized' },
    }),
    entry('kl-000002', 'impact', { body: { valence: 'negative' }, standing: { value: 'plausible_unobserved' } }),
    entry('kl-000003', 'context_value', { body: {} }),
    entry('kl-000004', 'pathway', { body: {}, lifecycle: { status: 'deprecated' } }),
  ];
  const index = entries.map((e) => ({ id: e.id, display_id: e.id, type: e.type, label: e.id, composition_type: null, standing: null, status: null }) as IndexRow);
  const catalog = new Catalog(entries, index);

  it('leaves retired entries out of counts', () => {
    expect(resolveToken('entries(pathway)', catalog).text).toBe('1');
    expect(resolveToken('pathways.with_condition|Word', catalog).text).toBe('One');
    expect(resolveToken('into(kl-000002)', catalog).text).toBe('1');
  });

  it('fails on an unknown fact, entry type, modifier or id', () => {
    expect(() => resolveToken('pathways.nonsense', catalog)).toThrow(/unknown fact/);
    expect(() => resolveToken('entries(widget)', catalog)).toThrow(/unknown entry type/);
    expect(() => resolveToken('entries(pathway)|loud', catalog)).toThrow(/unknown modifier/);
    expect(() => resolveToken('into(kl-999999)', catalog)).toThrow(/no entry/);
  });

  it('writes numbers the way prose does', () => {
    expect(formatCount(15, ['Word'])).toBe('Fifteen');
    expect(formatCount(21, ['word'])).toBe('21');
    expect(formatCount(1453, ['about'])).toBe('1,450');
    expect(formatCount(1, ['noun:pathway'])).toBe('1 pathway');
    expect(formatCount(8, ['Word', 'noun:entry'])).toBe('Eight entries');
    expect(approximate(414)).toBe(410);
    expect(sharePhrase(0.56)).toBe('more than half');
    expect(sharePhrase(0.32)).toBe('about a third');
  });
});

describe('title case', () => {
  it('keeps short words lowercase and leaves acronyms alone', () => {
    expect(titleCase('who is involved, and in what situation: context')).toBe('Who Is Involved, and in What Situation: Context');
    expect(titleCase('what the AI system is for')).toBe('What the AI System Is For');
  });
});
