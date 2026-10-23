import { describe, expect, it } from 'vitest';
import type { Link } from '../src/lib/links';
import { GRAPH_CAP, neighborhood, relationGroups, relationName } from '../src/lib/relations';

const link = (from: string, to: string, kind: string, attrs: Link['attrs'] = {}): Link => ({ from, to, kind, attrs });

describe('relation names', () => {
  it('names a link from the side being read', () => {
    expect(relationName(link('p', 'i', 'impacts'), 'from')).toBe('Leads to');
    expect(relationName(link('p', 'i', 'impacts'), 'to')).toBe('Reached by');
  });

  it('names a condition part as a gate', () => {
    const gate = link('p', 'v', 'composition_parts', { role: 'condition' });
    expect(relationName(gate, 'from')).toBe('Gated by');
    expect(relationName(gate, 'to')).toBe('Gates');
  });

  it('groups in reading order and leaves out boundaries', () => {
    const groups = relationGroups(
      [link('p', 'i', 'impacts'), link('p', 'b', 'composition_parts', { role: 'trigger' }), link('p', 'q', 'distinguish_from')],
      [],
    );
    expect(groups.map((g) => g.name)).toEqual(['Made of', 'Leads to']);
  });
});

describe('neighborhood', () => {
  const types: Record<string, string> = { p: 'pathway', b: 'ai_behavior', i: 'impact', s: 'source' };

  it('puts causes left and outcomes right, with sign as the line style', () => {
    const n = neighborhood('p', (id) => types[id], [link('p', 'b', 'composition_parts'), link('p', 'i', 'impacts', { sign: 'harmful' })], []);
    expect(n.columns).toEqual([['b'], ['p'], ['i']]);
    expect(n.edges.find((e) => e.to === 'i')?.kind).toBe('harmful');
  });

  it('caps each side and says how many are left out', () => {
    const many = Array.from({ length: GRAPH_CAP + 3 }, (_, i) => `i${i}`);
    const n = neighborhood('p', (id) => (id === 'p' ? 'pathway' : 'impact'), many.map((i) => link('p', i, 'impacts')), []);
    expect(n.columns[1]).toHaveLength(GRAPH_CAP);
    expect(n.hidden).toBe(3);
    expect(n.linked).toBe(GRAPH_CAP + 3);
  });
});
