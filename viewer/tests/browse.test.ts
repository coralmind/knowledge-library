import { describe, expect, it } from 'vitest';
import { browse, browseHref, groupKey, parseBrowseQuery, ratingOrder, toBrowseRows, type BrowseRow } from '../src/lib/browse';
import { entryLinks } from '../src/lib/links';
import { searchRows, snippet } from '../src/lib/search';
import type { EntryType } from '../src/lib/types';

type Raw = { id: string; type: EntryType } & Record<string, unknown>;

const entry = (id: string, type: EntryType, extra: Record<string, unknown> = {}): Raw => ({
  id,
  type,
  display_id: `${type}-${id.slice(-1)}`,
  label: `Label ${id}`,
  lifecycle: { status: 'draft' },
  ...extra,
});

const ENTRIES: Raw[] = [
  entry('kl-000001', 'pathway', {
    definition: 'A response that misses a disclosure.',
    standing: { value: 'theorized' },
    body: {
      composition_type: 'sequence',
      composition_parts: [{ id: 'kl-000002', role: 'trigger' }, { id: 'kl-000099', role: 'response' }],
      impacts: [{ impact: 'kl-000003', sign: 'harmful' }],
    },
    claims: [{ id: 'c1', text: 'Missing a disclosure delays help.' }],
    claim_evidence: [{ claim_id: 'c1', source: 'kl-000005', quote: 'Sycophancy increased short-term satisfaction.' }],
    distinguish_from: [{ neighbor: 'kl-000004', boundary: 'differs' }],
  }),
  entry('kl-000002', 'ai_behavior', { body: { detection_window: 'single_turn', groups: ['crisis'] } }),
  entry('kl-000003', 'impact', { body: { domain: 'safety' } }),
  entry('kl-000004', 'pathway', { lifecycle: { status: 'deprecated' }, body: {} }),
  entry('kl-000005', 'source', { body: { title: 'A study', source_quality: 'B', kind: 'empirical' } }),
  entry('kl-000006', 'experience_cluster', { body: { composed_of: [{ pathway: 'kl-000001' }] } }),
];

const ROWS: BrowseRow[] = toBrowseRows(ENTRIES);
const row = (id: string) => ROWS.find((r) => r.id === id) as BrowseRow;

describe('entry links', () => {
  it('keeps links to entries in the library and reports the rest', () => {
    const { links, dangling } = entryLinks(ENTRIES);
    expect(dangling.map((l) => l.to)).toEqual(['kl-000099']);
    expect(links.find((l) => l.kind === 'impacts')?.attrs).toEqual({ sign: 'harmful' });
    expect(links.map((l) => l.kind)).toContain('distinguish_from');
  });
});

describe('catalog rows', () => {
  it('counts links without distinguish_from, and evidence and citations', () => {
    expect(row('kl-000001').links).toBe(3);
    expect(row('kl-000001').evidence).toBe(1);
    expect(row('kl-000005').cited).toBe(1);
    expect(row('kl-000001').quotes[0]?.source).toBe('source-5');
  });

  it('takes a pathway cluster from the cluster that is composed of it', () => {
    expect(row('kl-000001').cluster).toBe('kl-000006');
    expect(groupKey(row('kl-000004'))).toBe('none');
  });
});

describe('catalog URL state', () => {
  it('drops unknown values and defaults to current entries', () => {
    const q = parseBrowseQuery({ type: 'nonsense', s: 'bogus', page: '-2', q: '  ' });
    expect(q).toMatchObject({ type: null, status: 'live', page: 1, q: null });
  });

  it('leaves defaults out of links', () => {
    expect(browseHref({ type: 'pathway', status: 'live', page: 1 })).toBe('/catalog?type=pathway');
    expect(browseHref({ type: 'pathway', status: 'all', page: 2 })).toBe('/catalog?type=pathway&s=all&page=2');
  });
});

describe('browse', () => {
  it('shows impacts by default and hides retired entries', () => {
    const view = browse(ROWS, parseBrowseQuery({}));
    expect(view.type).toBe('impact');
    expect(view.counts.pathway).toBe(1);
    expect(browse(ROWS, parseBrowseQuery({ type: 'pathway', s: 'all' })).rows).toHaveLength(2);
  });

  it('filters by facet and by group', () => {
    expect(browse(ROWS, parseBrowseQuery({ type: 'ai_behavior', g: 'crisis' })).rows).toHaveLength(1);
    expect(browse(ROWS, parseBrowseQuery({ type: 'ai_behavior', w: 'session' })).rows).toHaveLength(0);
    expect(browse(ROWS, parseBrowseQuery({ type: 'pathway', sec: 'kl-000006' })).rows).toHaveLength(1);
  });

  it('opens a search on the first kind with a match', () => {
    const view = browse(ROWS, parseBrowseQuery({ q: 'sycophancy' }));
    expect(view.type).toBe('pathway');
    expect(view.hits?.get('kl-000001')?.field.name).toBe('evidence quote, source-5');
  });

  it('orders ratings weakest first, with those outside the scale last', () => {
    expect(ratingOrder(['observed_in_transcripts', 'council_ratified', 'theorized'])).toEqual([
      'theorized',
      'observed_in_transcripts',
      'council_ratified',
    ]);
  });
});

describe('search', () => {
  it('needs every word and ranks a label match first', () => {
    expect(searchRows(ROWS, 'disclosure nothing')).toEqual([]);
    const [first] = searchRows(ROWS, 'label');
    expect(first?.field.name).toBe('label');
  });

  it('marks matches in an excerpt that starts near the first one', () => {
    const text = `${'x'.repeat(200)} the Match is here ${'y'.repeat(200)}`;
    const s = snippet(text, ['match'], 70);
    expect(s.before && s.after).toBe(true);
    expect(s.parts[1]).toBe('Match');
    expect(s.parts[0]?.length).toBeLessThanOrEqual(30 + ' the '.length);
  });
});
