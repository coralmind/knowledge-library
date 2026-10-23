/**
 * Every remaining field of an entry, collapsed: criteria first, then the
 * rest in stored order. Stored values show by their plain names and entry ids
 * as links. Fields already shown in the header are left out.
 */
import { loadGlossary } from '../../lib/glossary';
import { EntryText } from './IdRef';
import { Term } from './Term';

/** Body fields the header already shows. */
const IN_HEADER = new Set(['composition_type', 'detection_window', 'groups']);

/** Shown first, in this order, when present. */
const FIRST = ['observable_criteria', 'absence_criteria', 'exclusions', 'identity_criterion', 'time_course'];

/** Top-level fields that are not shown elsewhere on the page. */
const TOP_LEVEL = ['layer', 'contested', 'measurement'];

const human = (key: string) => key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

function vocabularyAt(path: string): string | undefined {
  return loadGlossary().lists.find((l) => l.field === path)?.vocabulary;
}

function Value({ path, value }: { path: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return <span className="muted">none</span>;
  if (typeof value === 'boolean') return <>{value ? 'yes' : 'no'}</>;
  if (typeof value === 'number') return <>{value}</>;
  if (typeof value === 'string') {
    const vocabulary = vocabularyAt(path);
    return vocabulary ? <Term vocabulary={vocabulary} value={value} /> : <EntryText text={value} />;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="muted">none</span>;
    return (
      <ul className="kv-list">
        {value.map((item, i) => (
          <li key={i}>
            <Value path={`${path}[]`} value={item} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <dl className="kv kv--nested">
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <div key={k}>
          <dt>{human(k)}</dt>
          <dd>
            <Value path={`${path}.${k}`} value={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** `omit` names further body fields the page already shows. */
export function Details({ entry, omit = [], title = 'Criteria and fields' }: { entry: Record<string, unknown>; omit?: string[]; title?: string }) {
  const body = (entry.body && typeof entry.body === 'object' ? entry.body : {}) as Record<string, unknown>;
  const keys = Object.keys(body).filter((k) => !IN_HEADER.has(k) && !omit.includes(k));
  const ordered = [...FIRST.filter((k) => keys.includes(k)), ...keys.filter((k) => !FIRST.includes(k))];
  const fields: [string, string, unknown][] = [
    ...ordered.map((k): [string, string, unknown] => [k, `body.${k}`, body[k]]),
    ...TOP_LEVEL.filter((k) => entry[k] !== undefined).map((k): [string, string, unknown] => [k, k, entry[k]]),
  ];
  const since = (entry.lifecycle as { since?: string } | undefined)?.since;
  if (since) fields.push(['in_library_since', 'lifecycle.since', since]);
  if (fields.length === 0) return null;

  return (
    <section className="entry-sec" id="details">
      <h2>Details</h2>
      <details className="blk">
        <summary>
          <b>{title}</b>
          <span className="ct">{fields.length} fields</span>
        </summary>
        <div className="inner">
          <dl className="kv">
            {fields.map(([key, path, value]) => (
              <div key={key}>
                <dt>{human(key)}</dt>
                <dd>
                  <Value path={path} value={value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </section>
  );
}
