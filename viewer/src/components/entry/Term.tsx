/** A stored value shown by its plain name, with its meaning on hover. */
import { plainName, plainValue } from '../../lib/glossary';

export function Term({ vocabulary, value, className = 'term' }: { vocabulary: string; value: string | null | undefined; className?: string }) {
  if (!value) return null;
  const meaning = plainValue(vocabulary, value)?.meaning;
  return (
    <span className={className} title={meaning}>
      {plainName(vocabulary, value)}
    </span>
  );
}
