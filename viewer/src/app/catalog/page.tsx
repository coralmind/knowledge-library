/**
 * Catalog: one kind of entry at a time, in compact rows, with a rail of kinds
 * and groups, filters, search and pages. All state is in the URL and resolved
 * on the server, so every view is linkable.
 */
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CatalogFacets } from '../../components/catalog/CatalogFacets';
import { CatalogRail } from '../../components/catalog/CatalogRail';
import { CatalogRow } from '../../components/catalog/CatalogRow';
import { RailDrawer } from '../../components/catalog/RailDrawer';
import { FeedbackBand } from '../../components/FeedbackBand';
import { loadBrowse, loadMeta } from '../../lib/artifacts';
import { CATALOG_TYPES, browse, browseHref, groupName, parseBrowseQuery } from '../../lib/browse';
import { plainValue, slug } from '../../lib/glossary';
import { TYPE_LABELS } from '../../lib/types';

export const metadata: Metadata = { title: 'Catalog · CoralMind Knowledge Library' };

/** Lower case except words that are acronyms, such as "AI". */
const lowerNoun = (s: string) => s.split(' ').map((w) => (/^[A-Z]{2}/.test(w) ? w : w.toLowerCase())).join(' ');

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseBrowseQuery(await searchParams);
  const all = loadBrowse();
  const view = browse(all, query);
  const byId = new Map(all.map((r) => [r.id, r]));
  const labelOf = (id: string) => byId.get(id)?.label;
  const kind = CATALOG_TYPES.find((t) => t.type === view.type);
  const many = kind?.many ?? TYPE_LABELS[view.type];
  const noun = lowerNoun(view.rows.length === 1 ? TYPE_LABELS[view.type] : many);
  const intro =
    view.type === 'source'
      ? 'The works the library cites. Open one to see every claim it supports.'
      : (plainValue('EntryType', view.type)?.meaning ?? '');
  const quarantined = loadMeta().quarantined.length;

  return (
    <>
      <div className="catalog container">
        <div className="catalog__grid">
          <header className="catalog__head">
            <p className="eyebrow">Catalog{query.sec ? ` · ${groupName(view.type, query.sec, labelOf)}` : ''}</p>
            <h1>{many}</h1>
            {intro && <p>{intro}</p>}
            {kind && (
              <p className="cat-help">
                More about {lowerNoun(many)}: <a href={`/guide#${kind.guide}`}>how they fit (guide, step {kind.step})</a>
                {' · '}
                <a href={`/guide/reference#${kind.reference}`}>every field (reference)</a>
                {' · '}
                <a href={`/guide/glossary#term-${slug(kind.term)}`}>definition (glossary)</a>
              </p>
            )}
          </header>
          <div className="catalog__rail">
            <Suspense fallback={<CatalogRail query={query} view={view} labelOf={labelOf} />}>
              <RailDrawer label={`Browse by type: ${many}`}>
                <CatalogRail query={query} view={view} labelOf={labelOf} />
              </RailDrawer>
            </Suspense>
          </div>
          <div className="catalog__main">
            {/* Keyed on the URL so the selects show the current filters after an in-place move. */}
            <CatalogFacets key={browseHref({ ...query, type: view.type })} query={query} view={view} noun={noun} />
            <div className="cat-rows">
              {view.shown.length === 0 ? (
                <p className="cat-rows__empty">
                  Nothing matches these filters. <a href={browseHref({ type: view.type })}>Show all {lowerNoun(many)}</a>.
                </p>
              ) : (
                view.shown.map((row) => <CatalogRow key={row.id} row={row} hit={view.hits?.get(row.id)} />)
              )}
            </div>
            {view.pages > 1 && (
              <nav className="cat-pager" aria-label="Pages">
                {Array.from({ length: view.pages }, (_, i) => i + 1).map((n) =>
                  n === view.page ? (
                    <span key={n} aria-current="page">
                      {n}
                    </span>
                  ) : (
                    <Link key={n} href={browseHref({ ...query, type: view.type, page: n }) as Route}>
                      {n}
                    </Link>
                  ),
                )}
              </nav>
            )}
            {/* Phrased against the whole library, not the filtered result. */}
            {quarantined > 0 && (
              <p className="caption">
                The catalog covers {all.length} of {all.length + quarantined} entries; {quarantined} are quarantined.
              </p>
            )}
          </div>
        </div>
      </div>
      <FeedbackBand />
    </>
  );
}
