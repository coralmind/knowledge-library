/** Text with the matched words of a search marked. */
import type { Snippet } from '../../lib/search';

export function Highlight({ snippet }: { snippet: Snippet }) {
  return (
    <>
      {snippet.before && '…'}
      {snippet.parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}
      {snippet.after && '…'}
    </>
  );
}
