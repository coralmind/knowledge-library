/**
 * The entries this one is told apart from, each with the boundary between
 * them, and the entries that draw their own boundary against this one.
 */
import { loadCatalog } from '../../lib/catalog';
import { EntryText, IdRef } from './IdRef';

type Boundary = { neighbor?: string; boundary?: string };

export function Boundaries({ id, entry }: { id: string; entry: Record<string, unknown> }) {
  const cat = loadCatalog();
  const own = ((entry.distinguish_from as Boundary[] | undefined) ?? []).filter((d) => d.neighbor);
  const named = new Set(own.map((d) => d.neighbor));
  const against = cat
    .linksTo(id)
    .filter((l) => l.kind === 'distinguish_from' && !named.has(l.from))
    .map((l) => ({
      from: l.from,
      text: ((cat.byId.get(l.from)?.distinguish_from as Boundary[] | undefined) ?? []).find((d) => d.neighbor === id)?.boundary,
    }));
  if (own.length === 0 && against.length === 0) return null;

  return (
    <section className="entry-sec" id="boundaries">
      <h2>
        Distinguished From <span className="muted">{own.length} {own.length === 1 ? 'neighbor' : 'neighbors'}</span>
      </h2>
      {own.map((d) => (
        <div key={d.neighbor} className="df">
          <IdRef id={d.neighbor as string} />
          <p>
            <EntryText text={d.boundary} />
          </p>
        </div>
      ))}
      {against.length > 0 && (
        <details className="blk">
          <summary>
            <b>Also drawn against this entry</b>
            <span className="ct">
              {against.length} {against.length === 1 ? 'entry names' : 'entries name'} this one as a neighbor
            </span>
          </summary>
          <div className="inner">
            {against.map((a) => (
              <div key={a.from} className="df">
                <IdRef id={a.from} />
                <p>
                  <EntryText text={a.text} />
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
