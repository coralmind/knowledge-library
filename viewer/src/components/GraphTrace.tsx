'use client';

/**
 * Wraps a server-drawn graph so that hovering or focusing a node lights up
 * every path through it, upstream and downstream, and dims the rest. With
 * `pin`, a click pins the node below the graph instead of opening it: its
 * details, rendered on the server in `details`, and links to explore from it
 * or open its entry.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { exploreHref } from '../lib/explore-url';

export interface PinDetail {
  type: string;
  /** Id, label and evidence rating. */
  head: ReactNode;
  definition: string | null;
}

export function GraphTrace({
  children,
  pin,
  details,
}: {
  children: ReactNode;
  pin?: { sign: string | null; root: string | null } | undefined;
  details?: Record<string, PinDetail> | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    const edges = [...svg.querySelectorAll<SVGPathElement>('path[data-f]')];
    const nodes = [...svg.querySelectorAll<SVGAElement>('a[data-id]')];
    const fwd = new Map<string, string[]>();
    const back = new Map<string, string[]>();
    for (const p of edges) {
      const f = p.dataset.f ?? '';
      const t = p.dataset.t ?? '';
      fwd.set(f, [...(fwd.get(f) ?? []), t]);
      back.set(t, [...(back.get(t) ?? []), f]);
    }
    const reach = (start: string, next: Map<string, string[]>) => {
      const seen = new Set([start]);
      const stack = [start];
      while (stack.length) {
        for (const n of next.get(stack.pop() as string) ?? []) {
          if (seen.has(n)) continue;
          seen.add(n);
          stack.push(n);
        }
      }
      return seen;
    };
    const on = (id: string) => {
      const up = reach(id, back);
      const down = reach(id, fwd);
      svg.classList.add('graph--dim');
      for (const n of nodes) n.classList.toggle('hl', up.has(n.dataset.id ?? '') || down.has(n.dataset.id ?? ''));
      for (const p of edges) {
        const f = p.dataset.f ?? '';
        const t = p.dataset.t ?? '';
        p.classList.toggle('hl', (up.has(f) && up.has(t)) || (down.has(f) && down.has(t)));
      }
    };
    const off = () => {
      svg.classList.remove('graph--dim');
      svg.querySelectorAll('.hl').forEach((x) => x.classList.remove('hl'));
    };
    const cleanups = nodes.map((n) => {
      const enter = () => on(n.dataset.id ?? '');
      const pick = (ev: Event) => {
        if (!pin) return;
        ev.preventDefault();
        setPicked(n.dataset.id ?? null);
      };
      n.addEventListener('click', pick);
      n.addEventListener('mouseenter', enter);
      n.addEventListener('focus', enter);
      n.addEventListener('mouseleave', off);
      n.addEventListener('blur', off);
      return () => {
        n.removeEventListener('click', pick);
        n.removeEventListener('mouseenter', enter);
        n.removeEventListener('focus', enter);
        n.removeEventListener('mouseleave', off);
        n.removeEventListener('blur', off);
      };
    });
    return () => cleanups.forEach((c) => c());
  }, [pin]);

  useEffect(() => {
    if (picked) pinned.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [picked]);

  return (
    <>
      <div className="graph" ref={ref}>
        {children}
      </div>
      {pin && picked && details?.[picked] && (
        <div className="graph-pin" ref={pinned} data-type={details[picked].type}>
          <div className="graph-pin__head">
            <span className="type-dot" aria-hidden="true" />
            {details[picked].head}
            <span className="graph-pin__actions">
              {picked !== pin.root && (
                <a className="cm-btn" href={exploreHref({ root: picked, sign: pin.sign })}>
                  Explore from here →
                </a>
              )}
              <a className="cm-btn" href={`/entry/${picked}`}>
                Open entry
              </a>
            </span>
          </div>
          {details[picked].definition && <p className="graph-pin__def">{details[picked].definition}</p>}
        </div>
      )}
    </>
  );
}
