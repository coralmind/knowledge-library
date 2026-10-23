'use client';

/**
 * The header search: results grouped by kind as you type, each with the field
 * that matched. Arrow keys move through them, Enter opens one, and Enter with
 * none chosen opens every result in the catalog. "/" focuses the box.
 */
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import type { SearchResponse } from '../app/api/search/route';
import { browseHref } from '../lib/browse-url';
import type { EntryType } from '../lib/types';
import { Highlight } from './catalog/Highlight';

type Option = { href: string; key: string };

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (pathname === '/catalog') setQ(new URLSearchParams(window.location.search).get('q') ?? '');
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const el = document.activeElement;
      if (ev.key !== '/' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      ev.preventDefault();
      input.current?.focus();
      input.current?.select();
    };
    const onClick = (ev: MouseEvent) => {
      if (!box.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      return;
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal })
        .then((r) => r.json() as Promise<SearchResponse>)
        .then((d) => {
          setData(d);
          setActive(-1);
        })
        .catch(() => undefined);
    }, 120);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [q]);

  const options: Option[] = [];
  for (const g of data?.groups ?? []) {
    for (const r of g.results) options.push({ href: `/entry/${r.id}`, key: r.id });
    if (g.total > g.results.length) options.push({ href: browseHref({ q: q.trim(), type: g.type as EntryType }), key: `more-${g.type}` });
  }
  if (data && data.total > 0) options.push({ href: browseHref({ q: q.trim() }), key: 'all' });
  const indexOf = (key: string) => options.findIndex((o) => o.key === key);

  const go = (href: string) => {
    setOpen(false);
    input.current?.blur();
    router.push(href as Route);
  };

  const onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      setOpen(true);
      setActive((a) => Math.max(0, Math.min(options.length - 1, a + (ev.key === 'ArrowDown' ? 1 : -1))));
    } else if (ev.key === 'Escape') {
      setOpen(false);
      input.current?.blur();
    }
  };

  const showing = open && q.trim().length >= 2 && data !== null;
  const optionProps = (key: string) => ({
    id: `${listId}-${key}`,
    role: 'option',
    'aria-selected': indexOf(key) === active,
    className: `site-search__res${indexOf(key) === active ? ' act' : ''}`,
  });

  return (
    <form
      ref={box}
      className="site-search"
      role="search"
      action="/catalog"
      onSubmit={(ev) => {
        ev.preventDefault();
        const chosen = options[active];
        if (chosen) go(chosen.href);
        else if (q.trim()) go(browseHref({ q: q.trim() }));
      }}
    >
      <input
        ref={input}
        type="search"
        name="q"
        value={q}
        onChange={(ev) => {
          setQ(ev.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        placeholder="Search labels, definitions, claims, quotes…"
        aria-label="Search the library"
        role="combobox"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={active >= 0 && options[active] ? `${listId}-${options[active].key}` : undefined}
      />
      <kbd aria-hidden="true">/</kbd>
      {showing && (
        <div className="site-search__results" id={listId} role="listbox" aria-label="Search results">
          {data.total === 0 && <p className="site-search__none">No matches for “{data.q}”.</p>}
          {data.groups.map((g) => (
            <div key={g.type} role="group" aria-label={g.many}>
              <p className="eyebrow site-search__grp">
                {g.many} · {g.total}
              </p>
              {g.results.map((r) => (
                <a key={r.id} href={`/entry/${r.id}`} data-type={r.type} {...optionProps(r.id)} onClick={(ev) => (ev.preventDefault(), go(`/entry/${r.id}`))}>
                  <span className="site-search__top">
                    <span className="mono muted">{r.display_id}</span>
                    <span className="site-search__label">{r.field ? r.label : <Highlight snippet={r.excerpt} />}</span>
                  </span>
                  {r.field && (
                    <>
                      <span className="site-search__why">matched in {r.field}</span>
                      <span className="site-search__snip">
                        <Highlight snippet={r.excerpt} />
                      </span>
                    </>
                  )}
                </a>
              ))}
              {g.total > g.results.length && (
                <a
                  href={browseHref({ q: q.trim(), type: g.type as EntryType })}
                  {...optionProps(`more-${g.type}`)}
                  onClick={(ev) => (ev.preventDefault(), go(browseHref({ q: q.trim(), type: g.type as EntryType })))}
                >
                  All {g.total} {g.many.replace(/\b(?!AI\b)\w/g, (c) => c.toLowerCase())} matching →
                </a>
              )}
            </div>
          ))}
          {data.total > 0 && (
            <a href={browseHref({ q: q.trim() })} {...optionProps('all')} onClick={(ev) => (ev.preventDefault(), go(browseHref({ q: q.trim() })))}>
              <b>See all {data.total} results in the catalog →</b>
            </a>
          )}
        </div>
      )}
    </form>
  );
}
