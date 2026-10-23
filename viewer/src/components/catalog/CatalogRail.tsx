/**
 * The catalog's left rail: every kind of entry with its count, grouped under
 * the guide's five steps so it runs in the same order as the introduction,
 * and for the kind being shown, its groups (an impact's area of life, a pathway's
 * cluster, a behavior's conversation span). Kinds the library has no entries
 * of are left out, and so are kinds the filters empty unless a search is on,
 * so a search shows where it found nothing. Retired kinds show only when
 * retired entries do.
 */
import type { Route } from 'next';
import Link from 'next/link';
import { CATALOG_TYPES, browseHref, groupKey, groupName, type BrowseQuery, type BrowseView, type CatalogType } from '../../lib/browse';
import { guideStepHeading } from '../../lib/content/load';
import { Inlines } from '../content/Markdown';

export function CatalogRail({ query, view, labelOf }: { query: BrowseQuery; view: BrowseView; labelOf: (id: string) => string | undefined }) {
  const keep = { q: query.q, status: query.status };
  const showRetired = query.status === 'all' || query.status === 'deprecated';

  const groups = new Map<string, number>();
  for (const r of view.ofType) {
    const k = groupKey(r);
    if (k !== null) groups.set(k, (groups.get(k) ?? 0) + 1);
  }
  const sub = [...groups.entries()]
    .map(([key, n]) => ({ key, n, name: groupName(view.type, key, labelOf) }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));

  const kind = (t: CatalogType) => {
    const n = view.counts[t.type] ?? 0;
    if (t.retired && !showRetired) return null;
    if (!view.present.has(t.type) || (n === 0 && !query.q)) return null;
    const on = view.type === t.type;
    return (
      <div key={t.type}>
        <Link
          href={browseHref({ ...keep, type: t.type }) as Route}
          className={on && !query.sec ? 'on' : on ? 'open' : undefined}
          aria-current={on && !query.sec ? 'page' : undefined}
          data-type={t.type}
        >
          <span>
            <span className="type-dot" aria-hidden="true" />
            {t.many}
          </span>
          <span className="c">{n}</span>
        </Link>
        {on && sub.length > 1 && (
          <div className="cat-rail__sub">
            {sub.map((g) => (
              <Link
                key={g.key}
                href={browseHref({ ...keep, type: t.type, sec: g.key }) as Route}
                className={query.sec === g.key ? 'on' : undefined}
                aria-current={query.sec === g.key ? 'page' : undefined}
              >
                <span>{g.name}</span>
                <span className="c">{g.n}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="cat-rail" aria-label="Browse by type">
      <p className="eyebrow cat-rail__h">Browse by type</p>
      {[...new Set(CATALOG_TYPES.map((t) => t.step))].map((step) => {
        const kinds = CATALOG_TYPES.filter((t) => t.step === step).map(kind).filter(Boolean);
        if (kinds.length === 0) return null;
        return (
          <div key={step} className="cat-rail__step">
            <p className="cat-rail__step-h">
              <span className="step-badge" aria-hidden="true">{step}</span>
              <span><Inlines nodes={guideStepHeading(step)} title /></span>
            </p>
            {kinds}
          </div>
        );
      })}
    </nav>
  );
}
