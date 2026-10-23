/**
 * The catalog's URL state: parsing it from search params and writing links to
 * it. Kept free of server-only imports, so client components can build
 * catalog links too.
 */
import { TYPE_LABELS, type EntryType } from './types';

/** Which entries the status filter keeps. `live` hides retired entries. */
export const STATUS_FILTERS = ['live', 'draft', 'active', 'deprecated', 'none', 'all'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export interface BrowseQuery {
  type: EntryType | null;
  /** The secondary group within the type, by its stored key. */
  sec: string | null;
  standing: string | null;
  window: string | null;
  group: string | null;
  composition: string | null;
  q: string | null;
  status: StatusFilter;
  page: number;
}

const first = (v: string | string[] | undefined): string | null => {
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : null;
};

/** Unknown values are dropped, so a stale URL broadens the results instead of erroring. */
export function parseBrowseQuery(params: Record<string, string | string[] | undefined>): BrowseQuery {
  const type = first(params.type);
  const s = first(params.s);
  const page = Number(first(params.page));
  return {
    type: type && type in TYPE_LABELS ? (type as EntryType) : null,
    sec: first(params.sec),
    standing: first(params.st),
    window: first(params.w),
    group: first(params.g),
    composition: first(params.ct),
    q: first(params.q),
    status: s && (STATUS_FILTERS as readonly string[]).includes(s) ? (s as StatusFilter) : 'live',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** The URL for a catalog view; empty and default values are left out. */
export function browseHref(q: Partial<BrowseQuery>): string {
  const p = new URLSearchParams();
  const put = (k: string, v: string | number | null | undefined) => {
    if (v !== null && v !== undefined && v !== '') p.set(k, String(v));
  };
  put('type', q.type);
  put('sec', q.sec);
  put('st', q.standing);
  put('w', q.window);
  put('g', q.group);
  put('ct', q.composition);
  put('q', q.q);
  put('s', q.status === 'live' ? null : q.status);
  put('page', q.page && q.page > 1 ? q.page : null);
  const s = p.toString();
  return s ? `/catalog?${s}` : '/catalog';
}
