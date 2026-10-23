/**
 * A link to an entry that leads with its current label, so prose never goes
 * stale when an entry is renamed. The display id and permanent id are in the
 * hover text, not the sentence.
 */
import { loadCatalog } from '../lib/catalog';

export function EntryRef({ id, text }: { id: string; text?: string | undefined }) {
  const row = loadCatalog().index.get(id);
  if (!row) throw new Error(`No entry ${id} to link to.`);
  return (
    <a className="entry-ref" href={`/entry/${id}`} data-type={row.type} title={`${row.display_id} · ${id}`}>
      <span className="type-dot" aria-hidden="true" />
      {text ?? row.label}
    </a>
  );
}
