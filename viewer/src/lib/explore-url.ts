/**
 * The Explore page's URL state. Kept free of server-only imports, so client
 * components can build Explore links too.
 */

export interface ExploreQuery {
  /** The entry to start from. */
  root: string | null;
  /** An AI behavior group and an area of life, as chosen from the map. */
  group: string | null;
  domain: string | null;
  /** Every current pathway. */
  all: boolean;
  sign: string | null;
  onset: string | null;
  horizon: string | null;
  /** The lowest evidence rating a pathway may have, as a step on the scale. */
  minRating: number | null;
}

const first = (v: string | string[] | undefined): string | null => {
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : null;
};

export function parseExploreQuery(params: Record<string, string | string[] | undefined>): ExploreQuery {
  const min = Number(first(params.minst));
  return {
    root: first(params.root),
    group: first(params.group),
    domain: first(params.domain),
    all: first(params.all) !== null,
    sign: first(params.sign),
    onset: first(params.onset),
    horizon: first(params.horizon),
    minRating: Number.isInteger(min) && min > 0 ? min : null,
  };
}

/** The URL for an Explore view; empty values are left out. */
export function exploreHref(q: Partial<ExploreQuery>): string {
  const p = new URLSearchParams();
  const put = (k: string, v: string | number | null | undefined) => {
    if (v !== null && v !== undefined && v !== '') p.set(k, String(v));
  };
  put('root', q.root);
  put('group', q.group);
  put('domain', q.domain);
  put('all', q.all ? 1 : null);
  put('sign', q.sign);
  put('onset', q.onset);
  put('horizon', q.horizon);
  put('minst', q.minRating);
  const s = p.toString();
  return s ? `/explore?${s}` : '/explore';
}

const ACRONYMS = new Set(['ai', 'ocd', 'ssh', 'nssi']);

/** An AI behavior group as a reader sees it: "ai-dependency-trajectory" to "AI dependency trajectory". */
export const groupLabel = (g: string): string =>
  g
    .split(/[-_]/)
    .map((w, i) => (ACRONYMS.has(w) ? w.toUpperCase() : i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
