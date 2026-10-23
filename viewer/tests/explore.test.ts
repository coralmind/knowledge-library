import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { BrowseRow } from '../src/lib/browse';
import { ExploreGraph, groupDomainMap, selectFlows, type Starter } from '../src/lib/explore';
import { exploreHref, groupLabel, parseExploreQuery } from '../src/lib/explore-url';
import type { Link } from '../src/lib/links';
import type { EntryType } from '../src/lib/types';

const row = (id: string, type: EntryType, extra: Partial<BrowseRow> = {}): BrowseRow => ({
  id,
  display_id: id,
  type,
  label: id,
  definition: null,
  aliases: [],
  standing: 'theorized',
  status: 'draft',
  claims: [],
  quotes: [],
  evidence: 0,
  links: 0,
  ...extra,
});
const link = (from: string, to: string, kind: string, attrs: Link['attrs'] = {}): Link => ({ from, to, kind, attrs });

const GRAPH = new ExploreGraph(
  [
    row('b1', 'ai_behavior', { groups: ['crisis'] }),
    row('v1', 'context_value'),
    row('p1', 'pathway', { standing: 'observed_in_transcripts' }),
    row('p2', 'pathway'),
    row('p3', 'pathway', { status: 'deprecated' }),
    row('i1', 'impact', { domain: 'safety' }),
    row('i2', 'impact', { domain: 'social' }),
  ],
  [
    link('p1', 'b1', 'composition_parts', { role: 'trigger' }),
    link('p1', 'v1', 'composition_parts', { role: 'condition' }),
    link('p1', 'i1', 'impacts', { sign: 'harmful' }),
    link('p2', 'b1', 'composition_parts', { role: 'trigger' }),
    link('p2', 'i2', 'impacts', { sign: 'protective' }),
    link('p3', 'b1', 'composition_parts'),
    link('p3', 'i1', 'impacts', { sign: 'harmful' }),
  ],
);
const q = (params: Record<string, string>) => parseExploreQuery(params);

describe('Explore selection', () => {
  it('from an impact, keeps only links into that impact and leaves retired pathways out', () => {
    const flows = selectFlows(GRAPH, q({ root: 'i1' }));
    expect(flows.map((f) => f.pathway.id)).toEqual(['p1']);
    expect(flows[0]?.impacts.map((l) => l.to)).toEqual(['i1']);
  });

  it('from a behavior, follows every pathway it is part of, filtered by sign', () => {
    expect(selectFlows(GRAPH, q({ root: 'b1' })).map((f) => f.pathway.id)).toEqual(['p1', 'p2']);
    expect(selectFlows(GRAPH, q({ root: 'b1', sign: 'protective' })).map((f) => f.pathway.id)).toEqual(['p2']);
  });

  it('applies the rating floor', () => {
    expect(selectFlows(GRAPH, q({ all: '1', minst: '5' })).map((f) => f.pathway.id)).toEqual(['p1']);
  });

  it('opens a map cell on the pathways with that group and area', () => {
    expect(selectFlows(GRAPH, q({ group: 'crisis', domain: 'social' })).map((f) => f.pathway.id)).toEqual(['p2']);
    const map = groupDomainMap(GRAPH);
    expect(map.count('crisis', 'safety')).toBe(1);
    expect(map.count('crisis', 'social')).toBe(1);
  });

  it('names groups with their acronyms in capitals', () => {
    expect(groupLabel('ai-dependency-trajectory')).toBe('AI dependency trajectory');
    expect(groupLabel('ssh-nssi-function')).toBe('SSH NSSI function');
  });

  it('round-trips its URL', () => {
    const query = q({ root: 'b1', sign: 'harmful', minst: '2' });
    expect(exploreHref(query)).toBe('/explore?root=b1&sign=harmful&minst=2');
  });
});

/** The page renders per request, so a starter naming a missing entry would otherwise fail only in a browser. */
describe('content/explore.yaml', () => {
  it('names only entries that exist', () => {
    const viewer = join(import.meta.dirname, '..');
    const { starters } = parse(readFileSync(join(viewer, 'content', 'explore.yaml'), 'utf-8')) as { starters: Starter[] };
    const entries = join(viewer, '..', 'entries');
    const ids = new Set(
      readdirSync(entries, { recursive: true, encoding: 'utf-8' })
        .filter((f) => f.endsWith('.yaml'))
        .flatMap((f) => /^id: (kl-\d{6})$/m.exec(readFileSync(join(entries, f), 'utf-8'))?.[1] ?? []),
    );
    for (const s of starters) if (s.root) expect(ids.has(s.root), `${s.question} names ${s.root}`).toBe(true);
  });
});
