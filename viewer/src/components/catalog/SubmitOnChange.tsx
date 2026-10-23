'use client';

/**
 * Applies a catalog filter as soon as a select changes, by moving to the
 * form's URL in place, with empty and default values left out. Renders nothing.
 */
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function SubmitOnChange() {
  const ref = useRef<HTMLSpanElement>(null);
  const router = useRouter();

  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const apply = () => {
      const params = new URLSearchParams();
      for (const [k, v] of new FormData(form)) {
        if (typeof v === 'string' && v !== '' && !(k === 's' && v === 'live')) params.set(k, v);
      }
      const query = params.toString();
      router.push(`${form.getAttribute('action') ?? ''}${query ? `?${query}` : ''}` as Route, { scroll: false });
    };
    form.addEventListener('change', apply);
    return () => form.removeEventListener('change', apply);
  }, [router]);

  return <span ref={ref} hidden />;
}
