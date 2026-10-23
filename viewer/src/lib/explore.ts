/**
 * What the Explore page draws: the pathways reachable from a starting entry,
 * or from a cell of the behavior-group by area-of-life map, with the parts
 * that make them and the impacts they lead to. Reads the public catalog rows
 * and links, never entry files, because the page renders per request.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { loadBrowse, loadGraph } from './artifacts';
import type { BrowseRow } from './browse';
import type { ExploreQuery } from './explore-url';
import { contentDir, ratingStep } from './glossary';
import type { Link } from './links';

export class ExploreGraph {
  readonly rows: Map<string, BrowseRow>;
  private readonly fromMap = new Map<string, Link[]>();
  private readonly toMap = new Map<string, Link[]>();

  constructor(rows: BrowseRow[], links: Link[]) {
    this.rows = new Map(rows.map((r) => [r.id, r]));
    for (const l of links) {
      this.fromMap.set(l.from, [...(this.fromMap.get(l.from) ?? []), l]);
      this.toMap.set(l.to, [...(this.toMap.get(l.to) ?? []), l]);
    }
  }

  from(id: string, kind?: string): Link[] {
    return (this.fromMap.get(id) ?? []).filter((l) => !kind || l.kind === kind);
  }

  to(id: string, kind?: string): Link[] {
    return (this.toMap.get(id) ?? []).filter((l) => !kind || l.kind === kind);
  }

  /** Current pathways, retired ones left out. */
  pathways(): BrowseRow[] {
    return [...this.rows.values()].filter((r) => r.type === 'pathway' && r.status !== 'deprecated');
  }

  parts(pathway: string): Link[] {
    return this.from(pathway, 'composition_parts').filter((l) => this.rows.has(l.to));
  }

  impacts(pathway: string): Link[] {
    return this.from(pathway, 'impacts').filter((l) => this.rows.has(l.to));
  }
}

let cached: ExploreGraph | null = null;

export function loadExploreGraph(): ExploreGraph {
  cached ??= new ExploreGraph(loadBrowse(), loadGraph().links);
  return cached;
}

export interface Flow {
  pathway: BrowseRow;
  parts: Link[];
  /** The pathway's impact links that pass the filters. */
  impacts: Link[];
}

/** The pathways a view covers, each with its parts and the impact links that pass the filters. */
export function selectFlows(g: ExploreGraph, q: ExploreQuery): Flow[] {
  const root = q.root ? g.rows.get(q.root) : undefined;
  let ids: string[] = [];
  let onlyImpact: string | null = null;
  if (root) {
    const into = (id: string, kind: string) => g.to(id, kind).map((l) => l.from);
    switch (root.type) {
      case 'impact':
        ids = into(root.id, 'impacts');
        onlyImpact = root.id;
        break;
      case 'pathway':
        ids = [root.id];
        break;
      case 'ai_behavior':
      case 'user_behavior':
      case 'operator_action':
        ids = into(root.id, 'composition_parts');
        break;
      case 'context_value':
        ids = [...into(root.id, 'composition_parts'), ...into(root.id, 'condition_tags').flatMap((u) => into(u, 'composition_parts'))];
        break;
      case 'experience_cluster':
        ids = [...g.from(root.id, 'composed_of').map((l) => l.to), ...into(root.id, 'cluster_candidate')];
        break;
      case 'mechanism':
        ids = [...into(root.id, 'mechanisms'), ...g.from(root.id, 'instances').flatMap((l) => into(l.to, 'composition_parts'))];
        break;
    }
  } else if (q.group || q.domain) {
    ids = g
      .pathways()
      .filter(
        (p) =>
          (!q.group || g.parts(p.id).some((l) => g.rows.get(l.to)?.groups?.includes(q.group as string))) &&
          (!q.domain || g.impacts(p.id).some((l) => g.rows.get(l.to)?.domain === q.domain)),
      )
      .map((p) => p.id);
  } else if (q.all) {
    ids = g.pathways().map((p) => p.id);
  }

  const filtering = Boolean(q.sign || q.onset || q.horizon);
  const keep = (l: Link) =>
    (!q.sign || l.attrs.sign === q.sign) &&
    (!q.onset || l.attrs.onset === q.onset) &&
    (!q.horizon || l.attrs.horizon === q.horizon) &&
    (!onlyImpact || l.to === onlyImpact) &&
    (!q.domain || g.rows.get(l.to)?.domain === q.domain);

  const flows: Flow[] = [];
  for (const id of new Set(ids)) {
    const p = g.rows.get(id);
    if (!p || p.type !== 'pathway' || p.status === 'deprecated') continue;
    if (q.minRating !== null && ratingStep(p.standing) < q.minRating) continue;
    const impacts = g.impacts(id).filter(keep);
    if (filtering && impacts.length === 0) continue;
    flows.push({ pathway: p, parts: g.parts(id), impacts });
  }
  return flows;
}

/** Current pathways counted by the AI behavior groups among their parts and the areas of life they reach. */
export function groupDomainMap(g: ExploreGraph): { groups: string[]; domains: string[]; count: (group: string, domain: string) => number; max: number } {
  const cells = new Map<string, number>();
  const domains = new Set<string>();
  const totals = new Map<string, number>();
  for (const r of g.rows.values()) if (r.type === 'impact' && r.domain) domains.add(r.domain);
  for (const p of g.pathways()) {
    const gs = new Set(g.parts(p.id).flatMap((l) => (g.rows.get(l.to)?.type === 'ai_behavior' ? (g.rows.get(l.to)?.groups ?? []) : [])));
    const ds = new Set(g.impacts(p.id).flatMap((l) => g.rows.get(l.to)?.domain ?? []));
    for (const grp of gs) {
      for (const d of ds) {
        cells.set(`${grp}|${d}`, (cells.get(`${grp}|${d}`) ?? 0) + 1);
        totals.set(grp, (totals.get(grp) ?? 0) + 1);
      }
    }
  }
  return {
    groups: [...totals.keys()].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0) || a.localeCompare(b)),
    domains: [...domains].sort(),
    count: (grp, d) => cells.get(`${grp}|${d}`) ?? 0,
    max: Math.max(1, ...cells.values()),
  };
}

export interface Starter {
  question: string;
  root?: string;
  sign?: string;
  all?: boolean;
  /** Shown under the question when there is no root to name. */
  note?: string;
}

export interface ExploreContent {
  title: string;
  intro: string;
  starters_heading: string;
  starters: Starter[];
  map_heading: string;
  map_intro: string;
}

/** The page's words, from `content/explore.yaml`. A starter naming an unknown entry throws. */
export function loadExploreContent(g: ExploreGraph): ExploreContent {
  const raw = parse(readFileSync(join(contentDir(), 'explore.yaml'), 'utf-8')) as ExploreContent;
  for (const s of raw.starters) {
    if (s.root && !g.rows.has(s.root)) throw new Error(`content/explore.yaml: starter "${s.question}" names no entry ${s.root}`);
  }
  return raw;
}
