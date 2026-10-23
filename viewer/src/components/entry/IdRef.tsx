/**
 * A link to an entry as a chip: its type color, display id and, unless
 * `short`, its label. An id with no entry renders as plain text.
 */
import { loadCatalog } from '../../lib/catalog';

/** `node` supplies the entry where the full catalog cannot be read, as on a per-request page. */
export function IdRef({
  id,
  short = false,
  labelOnly = false,
  node,
}: {
  id: string;
  short?: boolean;
  /** Show the label in place of the display id, as in running text; the display id moves to the hover text. */
  labelOnly?: boolean;
  node?: { display_id: string; label: string; type: string } | undefined;
}) {
  const row = node ?? loadCatalog().index.get(id);
  if (!row) return <span className="ref ref--missing">{id}</span>;
  if (labelOnly) {
    return (
      <a className="ref ref--inline" href={`/entry/${id}`} data-type={row.type} title={`${row.display_id} · ${id}`}>
        <span className="type-dot" aria-hidden="true" />
        <span className="ref__label">{row.label}</span>
      </a>
    );
  }
  return (
    <a className="ref" href={`/entry/${id}`} data-type={row.type} title={`${row.display_id} · ${row.label}`}>
      <span className="type-dot" aria-hidden="true" />
      <span className="ref__id">{row.display_id}</span>
      {!short && <span className="ref__label">{row.label}</span>}
    </a>
  );
}

/** Text with every entry id in it shown as a chip carrying the entry's label, so it reads as a sentence. */
export function EntryText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <>
      {text.split(/(kl-\d{6})/).map((part, i) => (i % 2 === 1 ? <IdRef key={i} id={part} labelOnly /> : part))}
    </>
  );
}
