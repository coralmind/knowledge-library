/**
 * Explore from a starting point: behaviors and context gates, the pathways
 * they form, and the impacts those lead to, as a graph and as a list, with
 * filters for direction, onset, how soon and evidence rating.
 */
import type { Route } from 'next';
import Link from 'next/link';
import type { ExploreGraph, Flow } from '../../lib/explore';
import { exploreHref, groupLabel, type ExploreQuery } from '../../lib/explore-url';
import { glossaryList, plainName, RATING_SCALE } from '../../lib/glossary';
import { SubmitOnChange } from '../catalog/SubmitOnChange';
import { Attrs } from '../entry/Connections';
import { IdRef } from '../entry/IdRef';
import { LayeredGraph, type GraphEdge } from '../PathwayGraph';
import { RatingMeter } from '../RatingMeter';

/** At most this many pathways are drawn; all are counted. */
const DRAWN = 45;

const SIGNS: [string, string][] = [
  ['', 'All links'],
  ['harmful', 'Harmful'],
  ['protective', 'Protective'],
];

function Select({ name, label, values, current }: { name: string; label: string; values: [string, string][]; current: string | null }) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={current ?? ''}>
        <option value="">Any</option>
        {values.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ExploreFlow({ graph, query, flows }: { graph: ExploreGraph; query: ExploreQuery; flows: Flow[] }) {
  const root = query.root ? graph.rows.get(query.root) : undefined;
  const shown = flows.slice(0, DRAWN);
  const left = new Set<string>();
  const right = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const { pathway, parts, impacts } of shown) {
    for (const l of parts) {
      left.add(l.to);
      const condition = l.attrs.role === 'condition';
      edges.push({ from: l.to, to: pathway.id, kind: condition ? 'condition' : undefined, title: plainName('PartRole', String(l.attrs.role ?? '')) });
    }
    for (const l of impacts) {
      right.add(l.to);
      const title = [l.attrs.sign, l.attrs.onset, l.attrs.horizon].filter((x): x is string => typeof x === 'string').join(' · ');
      edges.push({ from: pathway.id, to: l.to, kind: typeof l.attrs.sign === 'string' ? l.attrs.sign : undefined, title });
    }
  }
  const nodeOf = (id: string) => graph.rows.get(id);
  const values = (vocabulary: string): [string, string][] => (glossaryList(vocabulary)?.values ?? []).map((v) => [v.value, v.name]);

  return (
    <>
      <div className="xroot">
        {root ? (
          <>
            <span className="type-dot" data-type={root.type} aria-hidden="true" />
            <span className="mono muted">{root.display_id}</span>
            <h1 className="xroot__label">{root.label}</h1>
            <a href={`/entry/${root.id}`}>Open entry</a>
          </>
        ) : (
          <h1 className="xroot__label">
            {query.group ? `${groupLabel(query.group)} → ` : ''}
            {query.domain ? plainName('ImpactDomain', query.domain) : query.all ? 'All pathways' : ''}
          </h1>
        )}
        <Link className="xroot__back" href="/explore">
          Start over
        </Link>
      </div>

      <form className="xbar" method="get" action="/explore">
        {query.root && <input type="hidden" name="root" value={query.root} />}
        {query.group && <input type="hidden" name="group" value={query.group} />}
        {query.domain && <input type="hidden" name="domain" value={query.domain} />}
        {query.all && <input type="hidden" name="all" value="1" />}
        {query.sign && <input type="hidden" name="sign" value={query.sign} />}
        <span className="seg" role="group" aria-label="Direction">
          {SIGNS.map(([v, l]) => (
            <Link
              key={v}
              href={exploreHref({ ...query, sign: v || null }) as Route}
              className={(query.sign ?? '') === v ? 'on' : undefined}
              aria-current={(query.sign ?? '') === v ? 'true' : undefined}
            >
              {l}
            </Link>
          ))}
        </span>
        <Select name="onset" label="How it arrives" values={values('OnsetMode')} current={query.onset} />
        <Select name="horizon" label="How soon" values={values('Horizon')} current={query.horizon} />
        <Select
          name="minst"
          label="Pathway rating at least"
          values={RATING_SCALE.slice(1).map((v, i): [string, string] => [String(i + 1), plainName('Standing', v)])}
          current={query.minRating === null ? null : String(query.minRating)}
        />
        <SubmitOnChange />
        <span className="xbar__count">
          {flows.length} {flows.length === 1 ? 'pathway' : 'pathways'}
          {flows.length > DRAWN ? `, first ${DRAWN} drawn` : ''}
        </span>
      </form>

      {shown.length === 0 ? (
        <p className="muted">No pathways match these filters. Try “All links” or lower the rating threshold.</p>
      ) : (
        <>
          <LayeredGraph
            columns={[[...left], shown.map((f) => f.pathway.id), [...right]]}
            edges={edges}
            heads={[`Behaviors and context gates · ${left.size}`, `Pathways · ${shown.length}`, `Impacts · ${right.size}`]}
            root={query.root ?? undefined}
            label="Behaviors, the pathways they form, and the impacts those lead to"
            nodeWidth={290}
            gap={110}
            nodeOf={nodeOf}
            pin={{ sign: query.sign }}
          />
          <p className="legend">
            <span><i className="legend__harmful" />harmful</span>
            <span><i className="legend__protective" />protective</span>
            <span><i className="legend__condition" />context gate</span>
            <span>Hover to trace a chain. Click a node to explore from it.</span>
          </p>
          <details className="blk explore__list">
            <summary>
              <b>Show as a list</b>
              <span className="ct">the same {shown.length} pathways, readable without the graph</span>
            </summary>
            <div className="inner">
              {shown.map(({ pathway, parts, impacts }) => (
                <div key={pathway.id} className="df">
                  <IdRef id={pathway.id} node={pathway} /> <RatingMeter value={pathway.standing} />
                  <p>
                    {parts.map((l, i) => (
                      <span key={`p${i}`} className="explore__step">
                        <IdRef id={l.to} node={nodeOf(l.to)} short />
                        <Attrs link={l} />
                      </span>
                    ))}{' '}
                    →{' '}
                    {impacts.map((l, i) => (
                      <span key={`i${i}`} className="explore__step">
                        <IdRef id={l.to} node={nodeOf(l.to)} short />
                        <Attrs link={l} />
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </>
  );
}
