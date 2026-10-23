/**
 * Links between entries, named for readers from the side of the entry being
 * read: a pathway is "Made of" its parts, and each part is "Part of" it.
 */
import type { Link } from './links';

const FROM: Record<string, string> = {
  composition_parts: 'Made of',
  impacts: 'Leads to',
  mechanisms: 'Driven by',
  cluster_candidate: 'Candidate for cluster',
  composed_of: 'Made of',
  instances: 'Runs through',
  members: 'Compares',
  discriminator: 'Told apart by',
  condition_tags: 'Co-occurs with',
  irreversibility_conditions: 'Irreversible under',
  reference_behavior: 'Defined against',
  dimension: 'On dimension',
  experience_clusters: 'Wired to cluster',
  covers: 'Covers',
  superseded_by: 'Replaced by',
  downstream: 'Feeds',
};

const TO: Record<string, string> = {
  composition_parts: 'Part of',
  impacts: 'Reached by',
  mechanisms: 'Drives',
  cluster_candidate: 'Candidate pathways',
  composed_of: 'Part of',
  instances: 'Instance of',
  members: 'Member of',
  discriminator: 'Tells apart',
  condition_tags: 'Tagged on',
  irreversibility_conditions: 'Scopes irreversibility of',
  reference_behavior: 'Reference for',
  dimension: 'Values',
  experience_clusters: 'Context values',
  covers: 'Covered by',
  superseded_by: 'Replaces',
  downstream: 'Fed by',
};

/** The order relation groups appear in; any other relation follows. */
const ORDER = [
  'Made of',
  'Gated by',
  'Leads to',
  'Reached by',
  'Part of',
  'Gates',
  'Driven by',
  'Drives',
  'Candidate for cluster',
  'Candidate pathways',
  'Runs through',
  'Instance of',
  'Compares',
  'Member of',
  'Told apart by',
  'Tells apart',
];

export type Direction = 'from' | 'to';

/** A pathway part whose role is `condition` gates the pathway rather than composing it. */
export function relationName(link: Link, dir: Direction): string {
  if (link.kind === 'composition_parts' && link.attrs.role === 'condition') return dir === 'from' ? 'Gated by' : 'Gates';
  return (dir === 'from' ? FROM : TO)[link.kind] ?? link.kind.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export interface RelationGroup {
  name: string;
  items: { link: Link; dir: Direction; other: string }[];
}

/** An entry's links grouped by relation name, `distinguish_from` left out. */
export function relationGroups(from: Link[], to: Link[]): RelationGroup[] {
  const groups = new Map<string, RelationGroup['items']>();
  const add = (link: Link, dir: Direction) => {
    if (link.kind === 'distinguish_from') return;
    const name = relationName(link, dir);
    groups.set(name, [...(groups.get(name) ?? []), { link, dir, other: dir === 'from' ? link.to : link.from }]);
  };
  from.forEach((l) => add(l, 'from'));
  to.forEach((l) => add(l, 'to'));
  const rank = (n: string) => (ORDER.includes(n) ? ORDER.indexOf(n) : ORDER.length);
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b)).map(([name, items]) => ({ name, items }));
}

/** Which column of the neighborhood graph a kind of entry sits in: causes, pathways, outcomes. */
const COLUMN: Partial<Record<string, number>> = {
  user_behavior: 0,
  ai_behavior: 0,
  operator_action: 0,
  context_value: 0,
  mechanism: 0,
  context_dimension: 0,
  pathway: 1,
  contrast: 1,
  impact: 2,
  experience_cluster: 2,
};

export const GRAPH_CAP = 10;

/**
 * The entry and its direct neighbors in up to three columns: what feeds it on
 * the left, what it feeds on the right. Each side shows at most `GRAPH_CAP`.
 */
export function neighborhood(
  id: string,
  typeOf: (id: string) => string | undefined,
  from: Link[],
  to: Link[],
): { columns: string[][]; edges: { from: string; to: string; kind?: string; title: string }[]; linked: number; hidden: number } {
  const me = COLUMN[typeOf(id) ?? ''] ?? 1;
  const left: string[] = [];
  const right: string[] = [];
  const edges: { from: string; to: string; kind?: string; title: string }[] = [];
  const seen = new Set<string>();
  const add = (link: Link, dir: Direction) => {
    const other = dir === 'from' ? link.to : link.from;
    const type = typeOf(other);
    if (link.kind === 'distinguish_from' || seen.has(other) || !type || type === 'source') return;
    seen.add(other);
    const col = COLUMN[type] ?? 1;
    const onLeft = col < me || (col === me && dir === 'to');
    (onLeft ? left : right).push(other);
    const sign = typeof link.attrs.sign === 'string' ? link.attrs.sign : undefined;
    const kind = sign ?? (link.attrs.role === 'condition' ? 'condition' : undefined);
    const edge = { title: relationName(link, dir), ...(kind ? { kind } : {}) };
    edges.push(onLeft ? { from: other, to: id, ...edge } : { from: id, to: other, ...edge });
  };
  from.forEach((l) => add(l, 'from'));
  to.forEach((l) => add(l, 'to'));
  const columns = [left.slice(0, GRAPH_CAP), [id], right.slice(0, GRAPH_CAP)].filter((c, i) => i === 1 || c.length > 0);
  const shown = new Set(columns.flat());
  return {
    columns,
    edges: edges.filter((e) => shown.has(e.from) && shown.has(e.to)),
    linked: seen.size,
    hidden: Math.max(0, left.length - GRAPH_CAP) + Math.max(0, right.length - GRAPH_CAP),
  };
}
