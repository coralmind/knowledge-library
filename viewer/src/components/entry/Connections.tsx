/**
 * How an entry connects: its direct neighbors as a graph, then every link
 * listed by relation, with the attributes the link carries.
 */
import { loadCatalog } from '../../lib/catalog';
import type { Link } from '../../lib/links';
import { neighborhood, relationGroups } from '../../lib/relations';
import { LayeredGraph } from '../PathwayGraph';
import { IdRef } from './IdRef';
import { Term } from './Term';

const SHOWN = 8;

export function Attrs({ link }: { link: Link }) {
  const a = link.attrs;
  const bits = [
    typeof a.role === 'string' && <Term key="role" vocabulary="PartRole" value={a.role} />,
    a.absent === true && <span key="absent">absent</span>,
    typeof a.sign === 'string' && <Term key="sign" vocabulary="Sign" value={a.sign} />,
    typeof a.onset === 'string' && <Term key="onset" vocabulary="OnsetMode" value={a.onset} />,
    typeof a.horizon === 'string' && <Term key="horizon" vocabulary="Horizon" value={a.horizon} />,
  ].filter(Boolean);
  return (
    <>
      {bits.length > 0 && (
        <span className="att">
          {bits.map((b, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {b}
            </span>
          ))}
        </span>
      )}
      {typeof a.note === 'string' && <span className="att">{a.note}</span>}
    </>
  );
}

export function Connections({ id, displayId }: { id: string; displayId: string }) {
  const cat = loadCatalog();
  const from = cat.linksFrom(id);
  const to = cat.linksTo(id);
  const groups = relationGroups(from, to);
  const graph = neighborhood(id, (x) => cat.index.get(x)?.type, from, to);
  const item = ({ link, other }: (typeof groups)[number]['items'][number], i: number) => (
    <span key={`${other}-${i}`}>
      <IdRef id={other} />
      <Attrs link={link} />
    </span>
  );

  return (
    <section className="entry-sec" id="connections">
      <h2>
        How It Connects <span className="muted">{graph.linked} linked {graph.linked === 1 ? 'entry' : 'entries'}</span>
      </h2>
      {groups.length === 0 ? (
        <p className="muted">This entry has no links to other entries yet.</p>
      ) : (
        <>
          {graph.linked > 0 && (
            <>
              <LayeredGraph
                columns={graph.columns}
                edges={graph.edges}
                root={id}
                nodeWidth={230}
                gap={70}
                label={`Entries directly connected to ${displayId}`}
              />
              {graph.hidden > 0 && <p className="more-note">{graph.hidden} more not drawn; all are listed below.</p>}
              <p className="legend">
                <span><i className="legend__harmful" />harmful</span>
                <span><i className="legend__protective" />protective</span>
                <span><i className="legend__condition" />context gate</span>
                <span>Hover a node to trace it; click to open.</span>
              </p>
            </>
          )}
          <dl className="conn">
            {groups.map((g) => (
              <div key={g.name}>
                <dt>
                  {g.name} <span className="muted">{g.items.length}</span>
                </dt>
                <dd>
                  {g.items.slice(0, SHOWN).map(item)}
                  {g.items.length > SHOWN && (
                    <details>
                      <summary className="evmore">Show all {g.items.length}</summary>
                      {g.items.slice(SHOWN).map((x, i) => item(x, i + SHOWN))}
                    </details>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
