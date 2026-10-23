/**
 * Search results for the header's live dropdown: the best few matches of each
 * kind, with the field that matched and an excerpt. Reads the same public
 * rows as the catalog.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { loadBrowse } from '../../../lib/artifacts';
import { CATALOG_TYPES } from '../../../lib/browse';
import { searchRows, snippet, type Snippet } from '../../../lib/search';

export interface SearchResult {
  id: string;
  display_id: string;
  type: string;
  label: string;
  /** The field that matched, when it is not the label. */
  field: string | null;
  excerpt: Snippet;
}

export interface SearchResponse {
  q: string;
  total: number;
  groups: { type: string; many: string; total: number; results: SearchResult[] }[];
}

const PER_GROUP = 4;

export function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 200);
  const hits = q.length < 2 ? [] : searchRows(loadBrowse(), q);
  const groups = CATALOG_TYPES.map((t) => {
    const of = hits.filter((h) => h.row.type === t.type);
    return {
      type: t.type,
      many: t.many,
      total: of.length,
      results: of.slice(0, PER_GROUP).map((h): SearchResult => {
        const inLabel = h.field.name === 'label';
        return {
          id: h.row.id,
          display_id: h.row.display_id,
          type: h.row.type,
          label: h.row.label,
          field: inLabel ? null : h.field.name,
          excerpt: snippet(inLabel ? h.row.label : h.field.text, h.words, inLabel ? 200 : 70),
        };
      }),
    };
  }).filter((g) => g.total > 0);
  const body: SearchResponse = { q, total: hits.length, groups };
  return NextResponse.json(body);
}
