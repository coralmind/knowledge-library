'use client';

/**
 * The last few entries this reader opened in this tab, so a path through the
 * library can be retraced. Kept in session storage; shown once there are two.
 */
import { useEffect, useState } from 'react';

type Step = { href: string; label: string };
const KEY = 'kl-trail';
const KEEP = 6;

export function Trail({ href, label }: Step) {
  const [trail, setTrail] = useState<Step[]>([]);

  useEffect(() => {
    let saved: Step[] = [];
    try {
      saved = JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as Step[];
    } catch {
      saved = [];
    }
    const at = saved.findIndex((s) => s.href === href);
    const next = (at >= 0 ? saved.slice(0, at + 1) : [...saved, { href, label }]).slice(-KEEP);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable, as in a private window; the trail is a convenience.
    }
    setTrail(next);
  }, [href, label]);

  if (trail.length < 2) return null;
  return (
    <nav className="trail" aria-label="Your trail">
      <span>Trail:</span>
      {trail.map((s, i) =>
        i === trail.length - 1 ? (
          <b key={s.href} aria-current="page">{s.label}</b>
        ) : (
          <span key={s.href}>
            <a href={s.href}>{s.label}</a> ›
          </span>
        ),
      )}
    </nav>
  );
}
