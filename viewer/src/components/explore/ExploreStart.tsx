/**
 * Explore before a starting point is chosen: questions that open a view, and
 * a map of current pathways by AI behavior group and area of life.
 */
import type { Route } from 'next';
import Link from 'next/link';
import { selectFlows, groupDomainMap, type ExploreContent, type ExploreGraph } from '../../lib/explore';
import { exploreHref, groupLabel, parseExploreQuery } from '../../lib/explore-url';
import { plainName } from '../../lib/glossary';

/** A cell's shade, by its share of the busiest cell. */
const shade = (r: number) => (r > 0.6 ? 100 : r > 0.25 ? 60 : 30);

export function ExploreStart({ graph, content }: { graph: ExploreGraph; content: ExploreContent }) {
  const starters = content.starters
    .map((s) => {
      const q = { ...parseExploreQuery({}), root: s.root ?? null, sign: s.sign ?? null, all: Boolean(s.all) };
      const root = s.root ? graph.rows.get(s.root) : undefined;
      return {
        ...s,
        href: exploreHref(q),
        sub: root ? `Start from ${root.display_id}: ${root.label}` : (s.note ?? ''),
        empty: selectFlows(graph, q).length === 0,
      };
    })
    .filter((s) => !s.empty);
  const map = groupDomainMap(graph);

  return (
    <>
      <h2 className="explore__h2">{content.starters_heading}</h2>
      <div className="starters">
        {starters.map((s) => (
          <Link key={s.question} className="starter cm-card" href={s.href as Route}>
            <b>{s.question}</b>
            <span>{s.sub}</span>
          </Link>
        ))}
      </div>

      <h2 className="explore__h2">{content.map_heading}</h2>
      <p className="explore__note">{content.map_intro}</p>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th scope="col">AI behavior group</th>
              {map.domains.map((d) => (
                <th key={d} scope="col">
                  {plainName('ImpactDomain', d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {map.groups.map((grp) => (
              <tr key={grp}>
                <th scope="row">{groupLabel(grp)}</th>
                {map.domains.map((d) => {
                  const n = map.count(grp, d);
                  if (n === 0)
                    return (
                      <td key={d} className="matrix__zero">
                        ·
                      </td>
                    );
                  return (
                    <td key={d} style={{ background: `var(--cm-viz-insight-${shade(n / map.max)})` }}>
                      <Link
                        href={exploreHref({ group: grp, domain: d }) as Route}
                        title={`${n} ${n === 1 ? 'pathway' : 'pathways'}: ${groupLabel(grp)}, ${plainName('ImpactDomain', d)}`}
                      >
                        {n}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
