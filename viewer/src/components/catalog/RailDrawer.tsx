'use client';

/**
 * On narrow screens, holds the catalog rail in a drawer opened from a button
 * above the rows; it closes on a choice, on Escape or on a tap outside. On
 * wide screens the rail shows in place and the button is hidden.
 */
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

export function RailDrawer({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => setOpen(false), [pathname, params]);
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="cm-btn rail-toggle" aria-expanded={open} aria-controls="cat-rail" onClick={() => setOpen(true)}>
        ☰ {label}
      </button>
      <div className={`rail-drawer${open ? ' rail-drawer--open' : ''}`} id="cat-rail">
        {children}
      </div>
      {open && <div className="rail-scrim" aria-hidden="true" onClick={() => setOpen(false)} />}
    </>
  );
}
