/**
 * The catalog's rows and its URL state. Ingest builds the rows from redacted
 * entry bodies into `browse.public.json`; the catalog route filters, groups,
 * searches and pages them on the server from the URL, so every view is linkable.
 */
import { entryLinks } from './links';
import { plainName, ratingStep } from './glossary';
import { searchRows, type SearchHit } from './search';
import { type BrowseQuery, type StatusFilter } from './browse-url';
import { LIFECYCLE_STATUSES, type EntryType, type LifecycleStatus } from './types';

export { STATUS_FILTERS, browseHref, parseBrowseQuery, type BrowseQuery, type StatusFilter } from './browse-url';

export interface BrowseRow {
  id: string;
  display_id: string;
  type: EntryType;
  label: string;
  definition: string | null;
  aliases: string[];
  standing: string | null;
  status: LifecycleStatus | null;
  claims: { id: string; text: string }[];
  /** Evidence quotes, each with the display id of the source it is from. */
  quotes: { source: string; text: string }[];
  evidence: number;
  /** Links to and from other entries, not counting `distinguish_from`. */
  links: number;
  /** Stored values the catalog groups and filters on; each is set only on the types that have it. */
  domain?: string;
  window?: string;
  groups?: string[];
  composition_type?: string;
  about?: string;
  dimension?: string;
  cluster?: string;
  /** Source fields. */
  title?: string;
  authors?: string[];
  year?: string;
  venue?: string;
  quality?: string;
  source_kind?: string;
  /** Evidence rows across the library that cite this source. */
  cited?: number;
}

/** One kind of entry in the catalog's rail, and where the site explains it. */
export interface CatalogType {
  type: EntryType;
  /** The plural, shown as the page heading. */
  many: string;
  /** The guide step that introduces it; the rail groups kinds under these. */
  step: number;
  /** Heading id in the guide (`/guide`) that explains it. */
  guide: string;
  /** Heading id of its section in the reference (`/guide/reference`). */
  reference: string;
  /** Its term in the glossary. */
  term: string;
  retired?: boolean;
}

/** The catalog's types in rail order, grouped by the guide step that introduces each. */
export const CATALOG_TYPES: CatalogType[] = [
  { type: 'ai_behavior', many: 'AI Behaviors', step: 1, guide: 'step-1', reference: 'ai-behaviors', term: 'AI behavior' },
  { type: 'user_behavior', many: 'User Behaviors', step: 1, guide: 'step-1', reference: 'user-behaviors', term: 'User behavior' },
  { type: 'operator_action', many: 'Operator Actions', step: 1, guide: 'step-1', reference: 'operator-actions', term: 'Operator action' },
  { type: 'pathway', many: 'Pathways', step: 2, guide: 'step-2', reference: 'pathways', term: 'Pathway' },
  { type: 'mechanism', many: 'Mechanisms', step: 2, guide: 'mechanisms-and-experience-clusters', reference: 'mechanisms', term: 'Mechanism' },
  { type: 'experience_cluster', many: 'Experience Clusters', step: 2, guide: 'mechanisms-and-experience-clusters', reference: 'experience-clusters', term: 'Experience cluster' },
  { type: 'contrast', many: 'Contrasts', step: 2, guide: 'what-pathways-let-you-do', reference: 'contrasts', term: 'Contrast' },
  { type: 'context_dimension', many: 'Context Dimensions', step: 3, guide: 'context-dimensions-and-values', reference: 'context-dimensions-and-values', term: 'Context dimension' },
  { type: 'context_value', many: 'Context Values', step: 3, guide: 'context-dimensions-and-values', reference: 'context-dimensions-and-values', term: 'Context value' },
  { type: 'divergence', many: 'Divergences', step: 3, guide: 'how-context-changes-a-pathway', reference: 'divergences', term: 'Divergence' },
  { type: 'context', many: 'Person Contexts (retired)', step: 3, guide: 'step-3', reference: 'person-context-retired', term: 'Person context', retired: true },
  { type: 'impact', many: 'Impacts', step: 4, guide: 'step-4', reference: 'impacts', term: 'Impact' },
  { type: 'source', many: 'Sources', step: 5, guide: 'step-5', reference: 'sources', term: 'Source' },
];

type Raw = { id: string; type: EntryType } & Record<string, unknown>;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : typeof v === 'number' ? String(v) : undefined);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const status = (v: unknown): LifecycleStatus | null =>
  (LIFECYCLE_STATUSES as readonly unknown[]).includes(v) ? (v as LifecycleStatus) : null;

/** One row per entry, built from public (redacted) bodies only. */
export function toBrowseRows(entries: Raw[]): BrowseRow[] {
  const { links } = entryLinks(entries);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const linkCount = new Map<string, number>();
  const clusterOf = new Map<string, string>();
  for (const l of links) {
    if (l.kind !== 'distinguish_from') {
      linkCount.set(l.from, (linkCount.get(l.from) ?? 0) + 1);
      linkCount.set(l.to, (linkCount.get(l.to) ?? 0) + 1);
    }
    if (l.kind === 'cluster_candidate' && !clusterOf.has(l.from)) clusterOf.set(l.from, l.to);
  }
  for (const l of links) if (l.kind === 'composed_of' && byId.get(l.from)?.type === 'experience_cluster' && !clusterOf.has(l.to)) clusterOf.set(l.to, l.from);

  const cited = new Map<string, number>();
  for (const e of entries) {
    for (const r of Array.isArray(e.claim_evidence) ? e.claim_evidence.map(obj) : []) {
      const s = str(r.source);
      if (s) cited.set(s, (cited.get(s) ?? 0) + 1);
    }
  }
  const displayOf = (id: string) => str(byId.get(id)?.display_id) ?? id;

  return entries
    .map((e): BrowseRow => {
      const b = obj(e.body);
      const evidence = Array.isArray(e.claim_evidence) ? e.claim_evidence.map(obj) : [];
      const row: BrowseRow = {
        id: e.id,
        display_id: str(e.display_id) ?? e.id,
        type: e.type,
        label: str(e.label) ?? e.id,
        definition: str(e.definition) ?? null,
        aliases: strs(e.aliases),
        standing: str(obj(e.standing).value) ?? null,
        status: status(obj(e.lifecycle).status),
        claims: (Array.isArray(e.claims) ? e.claims.map(obj) : [])
          .map((c) => ({ id: str(c.id) ?? '', text: str(c.text) ?? '' }))
          .filter((c) => c.text),
        quotes: evidence
          .map((r) => ({ source: r.source ? displayOf(String(r.source)) : '', text: str(r.quote) ?? '' }))
          .filter((q) => q.text),
        evidence: evidence.length,
        links: linkCount.get(e.id) ?? 0,
      };
      const set = <K extends keyof BrowseRow>(k: K, v: BrowseRow[K] | undefined) => {
        if (v !== undefined) row[k] = v;
      };
      switch (e.type) {
        case 'impact':
          set('domain', str(b.domain));
          break;
        case 'ai_behavior':
        case 'user_behavior':
          set('window', str(b.detection_window));
          set('groups', strs(b.groups));
          break;
        case 'pathway':
          set('composition_type', str(b.composition_type));
          set('cluster', clusterOf.get(e.id));
          break;
        case 'context_dimension':
          set('about', str(b.about));
          break;
        case 'context_value':
          set('dimension', str(b.dimension));
          break;
        case 'source':
          set('title', str(b.title));
          set('authors', strs(b.authors).slice(0, 6));
          set('year', str(b.year));
          set('venue', str(b.venue));
          set('quality', str(b.source_quality));
          set('source_kind', str(b.kind));
          row.cited = cited.get(e.id) ?? 0;
          break;
      }
      return row;
    })
    .sort((a, b) => a.display_id.localeCompare(b.display_id, 'en', { numeric: true }));
}

function statusOk(row: BrowseRow, s: StatusFilter): boolean {
  if (row.type === 'source' || s === 'all') return true;
  if (s === 'live') return row.status !== 'deprecated';
  if (s === 'none') return row.status === null;
  return row.status === s;
}

/** The stored key of a row's secondary group, or null for a type that has none. */
export function groupKey(row: BrowseRow): string | null {
  switch (row.type) {
    case 'impact':
      return row.domain ?? 'none';
    case 'pathway':
      return row.cluster ?? 'none';
    case 'ai_behavior':
    case 'user_behavior':
      return row.window ?? 'none';
    case 'context_dimension':
      return row.about ?? 'none';
    case 'context_value':
      return row.dimension ?? 'none';
    case 'source':
      return row.quality ?? 'none';
    default:
      return null;
  }
}

/** The plain name of a secondary group; `labelOf` names an entry by id. */
export function groupName(type: EntryType, key: string, labelOf: (id: string) => string | undefined): string {
  switch (type) {
    case 'impact':
      return key === 'none' ? 'No area of life' : plainName('ImpactDomain', key);
    case 'pathway':
      return key === 'none' ? 'No cluster' : (labelOf(key) ?? key);
    case 'ai_behavior':
    case 'user_behavior':
      return key === 'none' ? 'Not set' : plainName('DetectionWindow', key);
    case 'context_dimension':
      return key === 'none' ? 'Not set' : plainName('ContextAbout', key);
    case 'context_value':
      return key === 'none' ? 'No dimension' : (labelOf(key) ?? key);
    case 'source':
      if (key === 'none') return 'Grade missing';
      return /^[A-Z]$/.test(key) ? `Grade ${key}` : plainName('SourceQuality', key);
    default:
      return key;
  }
}

export interface BrowseView {
  type: EntryType;
  /** Rows of the type after search and status, before the facets. */
  ofType: BrowseRow[];
  /** Rows after every filter, in display order. */
  rows: BrowseRow[];
  counts: Partial<Record<EntryType, number>>;
  /** Kinds with at least one entry in the library, whatever the filters. */
  present: Set<EntryType>;
  hits: Map<string, SearchHit> | null;
  page: number;
  pages: number;
  shown: BrowseRow[];
}

export const PAGE_SIZE = 50;

export function browse(all: BrowseRow[], query: BrowseQuery): BrowseView {
  const hits = query.q ? new Map(searchRows(all, query.q).map((h) => [h.row.id, h])) : null;
  const pool = all.filter((r) => statusOk(r, query.status) && (!hits || hits.has(r.id)));
  const counts: Partial<Record<EntryType, number>> = {};
  for (const r of pool) counts[r.type] = (counts[r.type] ?? 0) + 1;

  const type = query.type ?? (hits ? (CATALOG_TYPES.find((t) => counts[t.type])?.type ?? 'impact') : 'impact');
  const ofType = pool.filter((r) => r.type === type);
  let rows = ofType;
  if (query.sec) rows = rows.filter((r) => groupKey(r) === query.sec);
  if (query.standing) rows = rows.filter((r) => r.standing === query.standing);
  if (query.window) rows = rows.filter((r) => r.window === query.window);
  if (query.group) rows = rows.filter((r) => r.groups?.includes(query.group as string));
  if (query.composition) rows = rows.filter((r) => r.composition_type === query.composition);
  if (hits) rows = [...rows].sort((a, b) => (hits.get(b.id)?.score ?? 0) - (hits.get(a.id)?.score ?? 0));

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const present = new Set(all.map((r) => r.type));
  return { type, ofType, rows, counts, present, hits, page, pages, shown: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

/** The distinct values of a field across rows, ratings ordered weakest first and the rest alphabetically. */
export function facetValues(rows: BrowseRow[], pick: (r: BrowseRow) => string | string[] | null | undefined): string[] {
  return [...new Set(rows.flatMap((r) => [pick(r) ?? []].flat()))].filter(Boolean).sort();
}

export function ratingOrder(values: string[]): string[] {
  const rank = (v: string) => (ratingStep(v) < 0 ? 99 : ratingStep(v));
  return [...values].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
