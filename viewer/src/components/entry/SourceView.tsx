/**
 * A source: what it is, how it is graded, and every entry and claim in the
 * library that cites it.
 */
import { loadCatalog } from '../../lib/catalog';
import { plainName } from '../../lib/glossary';
import { RatingMeter } from '../RatingMeter';
import { Details } from './Details';
import { Term } from './Term';

type Evidence = { claim_id?: string; source?: string; quote?: string; contradicts?: boolean };

const FACTS: [string, string][] = [
  ['year', 'Year'],
  ['venue', 'Venue'],
  ['kind', 'Kind'],
  ['design', 'Design'],
  ['n_reported', 'n'],
  ['population', 'Population'],
  ['peer_reviewed', 'Peer review'],
  ['identifier', 'Identifier'],
];

const human = (v: unknown) => String(v).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function SourceView({ id, entry }: { id: string; entry: Record<string, unknown> }) {
  const cat = loadCatalog();
  const body = (entry.body ?? {}) as Record<string, unknown>;
  const grade = typeof body.source_quality === 'string' ? body.source_quality : undefined;
  const authors = Array.isArray(body.authors) ? body.authors.join(', ') : '';

  const citing = cat.all
    .map((e) => ({
      e,
      rows: ((e.claim_evidence as Evidence[] | undefined) ?? []).filter((r) => r.source === id),
    }))
    .filter((x) => x.rows.length > 0)
    .sort((a, b) => b.rows.length - a.rows.length);
  const total = citing.reduce((n, x) => n + x.rows.length, 0);

  return (
    <>
      <header className="entry-head">
        <p className="eyebrow">
          Source · <span className="mono">{String(entry.display_id)}</span>
        </p>
        <h1>{typeof body.title === 'string' ? body.title : String(entry.label)}</h1>
        <div className="entry-head__meta">
          {grade && /^[A-Z]$/.test(grade) && <span className="grade">{grade}</span>}
          {grade && (
            <span className="muted">
              Source grade: <Term vocabulary="SourceQuality" value={grade} />
            </span>
          )}
          {authors && <span className="muted">{authors}</span>}
        </div>
        <dl className="kv">
          {FACTS.filter(([k]) => body[k] !== undefined && body[k] !== null && body[k] !== '').map(([k, name]) => (
            <div key={k}>
              <dt>{name}</dt>
              <dd>{k === 'kind' ? plainName('SourceKind', String(body[k])) : k === 'year' || k === 'n_reported' || k === 'venue' || k === 'identifier' ? String(body[k]) : human(body[k])}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="entry-sec" id="supports">
        <h2>
          What This Source Supports{' '}
          <span className="muted">
            {total} evidence {total === 1 ? 'row' : 'rows'} across {citing.length} {citing.length === 1 ? 'entry' : 'entries'}
          </span>
        </h2>
        {citing.length === 0 ? (
          <p className="muted">No entry cites this source yet.</p>
        ) : (
          <div className="cat-rows">
            {citing.map(({ e, rows }) => {
              const row = cat.index.get(e.id);
              const against = rows.filter((r) => r.contradicts).length;
              const claims = [...new Set(rows.map((r) => r.claim_id).filter(Boolean))];
              return (
                <a key={e.id} className="cat-row" href={`/entry/${e.id}`} data-type={e.type}>
                  <span className="cat-row__id">{row?.display_id}</span>
                  <span className="cat-row__label">
                    {row?.label}
                    <span className="cat-row__detail">{rows[0]?.quote ?? ''}</span>
                  </span>
                  <span className="cat-row__meta">
                    <RatingMeter value={row?.standing} />
                    <span>
                      {rows.length} {rows.length === 1 ? 'row' : 'rows'} ({claims.join(', ')})
                    </span>
                    {against > 0 && <span className="claim__con">{against} contradicting</span>}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </section>

      <Details entry={entry} omit={['title', 'authors', ...FACTS.map(([k]) => k), 'source_quality']} title="Grading and license" />
    </>
  );
}
