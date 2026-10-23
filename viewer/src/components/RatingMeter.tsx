/**
 * An evidence rating as a six-step meter beside its plain name. The meter is
 * decorative; the name carries the meaning, so it never relies on color alone.
 */
import { plainName, plainValue, RATING_SCALE, ratingStep } from '../lib/glossary';

export function Meter({ value }: { value: string | null | undefined }) {
  const step = ratingStep(value);
  if (step < 0) return null;
  return (
    <span className="meter" aria-hidden="true">
      {RATING_SCALE.map((v, i) => (
        <i key={v} className={i <= step ? 'on' : undefined} />
      ))}
    </span>
  );
}

export function RatingMeter({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  const step = ratingStep(value);
  const where = step >= 0 ? `${step + 1} of ${RATING_SCALE.length}` : 'outside the scale';
  return (
    <span className="rating" title={`Evidence rating, ${where}. ${plainValue('Standing', value)?.meaning ?? ''}`}>
      <Meter value={value} />
      {plainName('Standing', value)}
    </span>
  );
}
