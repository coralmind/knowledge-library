/**
 * The filter bar above the catalog rows. A change moves to the filtered URL,
 * which the server resolves, so every filtered view is linkable. Sources have
 * no status, so they get no status filter.
 */
import {
  STATUS_FILTERS,
  browseHref,
  facetValues,
  ratingOrder,
  type BrowseQuery,
  type BrowseView,
} from '../../lib/browse';
import { plainName } from '../../lib/glossary';
import { SubmitOnChange } from './SubmitOnChange';

const STATUS_NAMES: Record<string, string> = {
  live: 'Current (hide retired)',
  none: 'No status',
  all: 'All, including retired',
};

function Select({
  name,
  label,
  values,
  current,
  any = true,
  nameOf,
}: {
  name: string;
  label: string;
  values: readonly string[];
  current: string | null;
  any?: boolean;
  nameOf: (v: string) => string;
}) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={current ?? ''}>
        {any && <option value="">Any</option>}
        {values.map((v) => (
          <option key={v} value={v}>
            {nameOf(v)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CatalogFacets({ query, view, noun }: { query: BrowseQuery; view: BrowseView; noun: string }) {
  const t = view.type;
  const behaviors = t === 'ai_behavior' || t === 'user_behavior';
  return (
    <form className="cat-facets" method="get" action="/catalog">
      <input type="hidden" name="type" value={t} />
      {query.sec && <input type="hidden" name="sec" value={query.sec} />}
      {query.q && <input type="hidden" name="q" value={query.q} />}
      {t !== 'source' && (
        <Select
          name="st"
          label="Evidence rating"
          values={ratingOrder(facetValues(view.ofType, (r) => r.standing))}
          current={query.standing}
          nameOf={(v) => plainName('Standing', v)}
        />
      )}
      {t === 'source' ? (
        query.status !== 'live' && <input type="hidden" name="s" value={query.status} />
      ) : (
        <Select
          name="s"
          label="Status"
          values={STATUS_FILTERS}
          current={query.status}
          any={false}
          nameOf={(v) => STATUS_NAMES[v] ?? plainName('LifecycleStatus', v)}
        />
      )}
      {behaviors && (
        <>
          <Select
            name="w"
            label="Conversation needed"
            values={facetValues(view.ofType, (r) => r.window)}
            current={query.window}
            nameOf={(v) => plainName('DetectionWindow', v)}
          />
          <Select name="g" label="Group" values={facetValues(view.ofType, (r) => r.groups)} current={query.group} nameOf={(v) => v.replace(/_/g, ' ')} />
        </>
      )}
      {t === 'pathway' && (
        <Select
          name="ct"
          label="How the parts combine"
          values={facetValues(view.ofType, (r) => r.composition_type)}
          current={query.composition}
          nameOf={(v) => plainName('CompositionType', v)}
        />
      )}
      {query.q && (
        <span className="chip cat-facets__search">
          Search: “{query.q}”{' '}
          <a href={browseHref({ ...query, q: null, page: 1 })} aria-label="Clear the search">
            ×
          </a>
        </span>
      )}
      <SubmitOnChange />
      <span className="cat-facets__count">
        {view.rows.length} {noun}
      </span>
    </form>
  );
}
