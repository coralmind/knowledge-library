/**
 * An entry's claims, each with the evidence for it: the source and its grade,
 * how closely the passage fits, what it does for the claim, the quoted
 * passage, what it licenses and any inference beyond it. The claim that sets
 * the entry's evidence rating is marked.
 */
import { loadCatalog } from '../../lib/catalog';
import { plainName } from '../../lib/glossary';
import { EntryText, IdRef } from './IdRef';
import { Term } from './Term';

type Claim = { id?: string; kind?: string; text?: string };
type Evidence = {
  claim_id?: string;
  source?: string;
  quote?: string;
  locator?: string;
  licenses?: string;
  bridge?: string | null;
  fit?: string;
  contributes?: string;
  contradicts?: boolean;
};
type Standing = { value?: string; basis?: string; floored_by?: string; as_of?: string };

function EvidenceRow({ r }: { r: Evidence }) {
  const source = r.source ? loadCatalog().byId.get(r.source) : undefined;
  const body = (source?.body ?? {}) as { source_quality?: string; year?: string | number };
  return (
    <div className="ev">
      <div className="ev__src">
        {body.source_quality && /^[A-Z]$/.test(body.source_quality) && (
          <span className="grade" title={`Source grade ${body.source_quality}`}>
            {body.source_quality}
          </span>
        )}
        {r.source && <IdRef id={r.source} />}
        {body.year !== undefined && <span className="muted">{body.year}</span>}
      </div>
      <div className="ev__how">
        {r.fit && (
          <>
            <Term vocabulary="Fit" value={r.fit} /> fit
          </>
        )}
        {r.fit && r.contributes && ' · '}
        <Term vocabulary="Contributes" value={r.contributes} />
        {r.locator && <> · {r.locator}</>}
        {r.contradicts && (
          <>
            {' · '}
            <span className="ev__x">contradicts</span>
          </>
        )}
      </div>
      {r.quote && <blockquote>{r.quote}</blockquote>}
      {r.licenses && (
        <p className="ev__licenses">
          <EntryText text={r.licenses} />
        </p>
      )}
      {r.bridge && (
        <p className="ev__bridge">
          <b>Inference:</b> <EntryText text={r.bridge} />
        </p>
      )}
    </div>
  );
}

export function ClaimsEvidence({ entry }: { entry: Record<string, unknown> }) {
  const claims = (entry.claims as Claim[] | undefined) ?? [];
  const evidence = (entry.claim_evidence as Evidence[] | undefined) ?? [];
  const standing = (entry.standing as Standing | undefined) ?? {};

  return (
    <section className="entry-sec" id="evidence">
      <h2>
        Claims and Evidence{' '}
        <span className="muted">
          {claims.length} {claims.length === 1 ? 'claim' : 'claims'} · {evidence.length} evidence {evidence.length === 1 ? 'row' : 'rows'}
        </span>
      </h2>
      {standing.basis && (
        <details className="blk">
          <summary>
            <b>Why this rating</b>
            <span className="ct">
              why this entry is rated “{plainName('Standing', standing.value)}”{standing.as_of ? `, as of ${standing.as_of}` : ''}
            </span>
          </summary>
          <div className="inner">
            <EntryText text={standing.basis} />
          </div>
        </details>
      )}
      {claims.length === 0 && <p className="muted">No claims recorded.</p>}
      {claims.map((c) => {
        const ev = evidence.filter((r) => r.claim_id === c.id);
        const against = ev.filter((r) => r.contradicts).length;
        const direct = ev.filter((r) => r.fit === 'direct').length;
        const floor = standing.floored_by === c.id;
        return (
          <div key={c.id} className={`claim${floor ? ' claim--floor' : ''}`}>
            <div className="claim__head">
              <span className="chip">
                <span className="mono">{c.id}</span> · <Term vocabulary="ClaimKind" value={c.kind} />
              </span>
              {floor && <span className="claim__floor">Sets the rating</span>}
              {ev.length - against > 0 && <span className="claim__sup">{ev.length - against} supporting</span>}
              {against > 0 && <span className="claim__con">{against} contradicting</span>}
              {direct > 0 && <span className="muted">{direct} direct fit</span>}
              {ev.length === 0 && <span className="muted">no evidence</span>}
            </div>
            <p className="claim__text">
              <EntryText text={c.text} />
            </p>
            {ev.length > 0 && (
              <details>
                <summary className="evmore">Evidence ({ev.length})</summary>
                {ev.map((r, i) => (
                  <EvidenceRow key={i} r={r} />
                ))}
              </details>
            )}
          </div>
        );
      })}
    </section>
  );
}
