/**
 * One entry: what it is, how it connects, and the claims and evidence behind
 * it. A source shows what it supports instead. Prerendered for every entry id
 * from its redacted artifact.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FeedbackBand } from '../../../components/FeedbackBand';
import { RatingMeter } from '../../../components/RatingMeter';
import { Boundaries } from '../../../components/entry/Boundaries';
import { ClaimsEvidence } from '../../../components/entry/ClaimsEvidence';
import { Connections } from '../../../components/entry/Connections';
import { CopyButton } from '../../../components/entry/CopyButton';
import { Details } from '../../../components/entry/Details';
import { EntryText } from '../../../components/entry/IdRef';
import { SourceView } from '../../../components/entry/SourceView';
import { Term } from '../../../components/entry/Term';
import { Trail } from '../../../components/entry/Trail';
import { entryIds, loadIndex, loadMeta, loadPublicEntry } from '../../../lib/artifacts';
import { browseHref } from '../../../lib/browse';
import { loadExploreGraph, selectFlows } from '../../../lib/explore';
import { exploreHref, parseExploreQuery } from '../../../lib/explore-url';
import { plainName } from '../../../lib/glossary';
import { TYPE_LABELS } from '../../../lib/types';

/**
 * `dynamicParams = false` makes an unlisted id a static 404. Without it the
 * route would read artifacts at request time, which the tracing exclude in
 * `next.config.ts` keeps out of the bundle, and an unknown id would 500.
 */
export const dynamicParams = false;

export function generateStaticParams(): { id: string }[] {
  return entryIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = loadIndex().find((r) => r.id === id);
  return { title: row ? `${row.display_id}: ${row.label} · CoralMind Knowledge Library` : 'CoralMind Knowledge Library' };
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = loadIndex().find((candidate) => candidate.id === id);
  if (row === undefined) notFound();

  const entry = loadPublicEntry(id);
  const meta = loadMeta();
  const body = (entry.body ?? {}) as { composition_type?: string; detection_window?: string; groups?: string[] };
  const aliases = Array.isArray(entry.aliases) ? (entry.aliases as string[]) : [];
  const cite = `CoralMind Knowledge Library ${meta.version ?? ''}, ${row.display_id} “${row.label}” (${id}). Content digest ${meta.digest.slice(0, 12)}.`;
  const hasBoundaries = Array.isArray(entry.distinguish_from) && entry.distinguish_from.length > 0;
  const hasDetails = Object.keys(body).length > 0;
  // Offered only where Explore has pathways to draw from this entry.
  const explorable = selectFlows(loadExploreGraph(), { ...parseExploreQuery({}), root: id }).length > 0;

  return (
    <>
      <div className="entry-page container">
        <article>
          <Trail href={`/entry/${id}`} label={row.display_id} />
          {row.type === 'source' ? (
            <SourceView id={id} entry={entry} />
          ) : (
            <>
              <header className="entry-head">
                <p className="eyebrow">
                  {TYPE_LABELS[row.type]} · <span className="mono">{row.display_id}</span> ·{' '}
                  {row.status ? plainName('LifecycleStatus', row.status) : 'no status'}
                </p>
                <h1>{row.label}</h1>
                <div className="entry-head__meta">
                  <span className="chip" data-type={row.type}>
                    <span className="type-dot" aria-hidden="true" />
                    {TYPE_LABELS[row.type]}
                  </span>
                  <RatingMeter value={row.standing} />
                  <Term vocabulary="CompositionType" value={body.composition_type} className="chip term" />
                  <Term vocabulary="DetectionWindow" value={body.detection_window} className="chip term" />
                  {(body.groups ?? []).map((g) => (
                    <a key={g} className="chip" href={browseHref({ type: row.type, group: g })}>
                      {g}
                    </a>
                  ))}
                  {aliases.length > 0 && <span className="muted mono">aka {aliases.join(', ')}</span>}
                </div>
                <p className="entry-head__def">
                  <EntryText text={typeof entry.definition === 'string' ? entry.definition : ''} />
                </p>
                <div className="entry-head__actions">
                  {explorable && (
                    <a className="cm-btn" href={exploreHref({ root: id })}>
                      Explore from here →
                    </a>
                  )}
                  <CopyButton text={id} label="Copy id" />
                  <CopyButton text={cite} label="Cite" />
                </div>
              </header>
              <Connections id={id} displayId={row.display_id} />
              <ClaimsEvidence entry={entry} />
              <Boundaries id={id} entry={entry} />
              <Details entry={entry} />
            </>
          )}
        </article>
        <nav className="entry-toc" aria-label="On this page">
          <p className="eyebrow">On this page</p>
          {row.type === 'source' ? (
            <a href="#supports">What This Source Supports</a>
          ) : (
            <>
              <a href="#connections">How It Connects</a>
              <a href="#evidence">Claims and Evidence</a>
              {hasBoundaries && <a href="#boundaries">Distinguished From</a>}
              {hasDetails && <a href="#details">Details</a>}
            </>
          )}
          <a href="#feedback" className="entry-toc__report">
            Report a Problem
          </a>
        </nav>
      </div>
      <FeedbackBand entry={row} version={meta.version} digest={meta.digest} />
    </>
  );
}
