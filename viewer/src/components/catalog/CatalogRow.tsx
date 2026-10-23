/**
 * One compact catalog row: display id, label, a line of definition (or, under
 * a search, the passage that matched), and the evidence rating and counts.
 */
import type { BrowseRow } from '../../lib/browse';
import { plainName, plainValue } from '../../lib/glossary';
import { snippet, type SearchHit } from '../../lib/search';
import { RatingMeter } from '../RatingMeter';
import { Highlight } from './Highlight';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function CatalogRow({ row, hit }: { row: BrowseRow; hit?: SearchHit | undefined }) {
  const inLabel = hit?.field.name === 'label';
  const detail =
    row.type === 'source' ? [row.venue, row.year].filter(Boolean).join(' · ') : (row.definition ?? '');

  return (
    <a className="cat-row" href={`/entry/${row.id}`} data-type={row.type}>
      <span className="cat-row__id">{row.display_id}</span>
      <span className="cat-row__label">
        {inLabel && hit ? <Highlight snippet={snippet(row.label, hit.words, 300)} /> : row.label}
        <span className="cat-row__detail">
          {hit && !inLabel ? (
            <>
              <span className="muted">{hit.field.name}:</span> <Highlight snippet={snippet(hit.field.text, hit.words, 90)} />
            </>
          ) : (
            detail
          )}
        </span>
      </span>
      <span className="cat-row__meta">
        {row.type === 'source' ? (
          <>
            {row.quality && /^[A-Z]$/.test(row.quality) && (
              <span className="grade" title={`Source grade ${row.quality}. ${plainValue('SourceQuality', row.quality)?.meaning ?? ''}`}>
                {row.quality}
              </span>
            )}
            {row.source_kind && <span>{plainName('SourceKind', row.source_kind)}</span>}
            <span>cited {row.cited ?? 0}×</span>
          </>
        ) : (
          <>
            <RatingMeter value={row.standing} />
            {row.status && row.status !== 'draft' && (
              <span className={`cat-row__status cat-row__status--${row.status}`}>{plainName('LifecycleStatus', row.status)}</span>
            )}
            <span>
              {plural(row.claims.length, 'claim')} · {row.evidence} evidence · {plural(row.links, 'link')}
            </span>
          </>
        )}
      </span>
    </a>
  );
}
