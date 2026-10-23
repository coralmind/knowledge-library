/**
 * The frame of every guide page: the tabs, an outline that stays in view, the
 * page, and links to the previous and next guide pages.
 */
import type { ReactNode } from 'react';
import type { OutlineItem } from '../lib/content/load';
import { Inlines } from './content/Markdown';

export const GUIDE_PAGES = [
  { href: '/guide', label: 'How the Library Works' },
  { href: '/guide/evaluation', label: 'How an Evaluation Uses It' },
  { href: '/guide/reference', label: 'Reference' },
  { href: '/guide/glossary', label: 'Glossary' },
] as const;

export type GuideHref = (typeof GUIDE_PAGES)[number]['href'];

export function GuideShell({ current, outline, children }: { current: GuideHref; outline: OutlineItem[]; children: ReactNode }) {
  const at = GUIDE_PAGES.findIndex((p) => p.href === current);
  const prev = GUIDE_PAGES[at - 1];
  const next = GUIDE_PAGES[at + 1];
  return (
    <div className="guide container">
      <p className="eyebrow">Guide</p>
      <nav className="guide-tabs" aria-label="Guide pages">
        {GUIDE_PAGES.map((p) => (
          <a key={p.href} href={p.href} aria-current={p.href === current ? 'page' : undefined}>
            {p.label}
          </a>
        ))}
      </nav>
      <div className="guide__layout">
        <nav className="guide-outline" aria-label="On this page">
          <p className="eyebrow">On this page</p>
          <ol>
            {outline.map((item) => (
              <li key={item.id} className={item.sub ? 'guide-outline__sub' : undefined}>
                <a href={`#${item.id}`}>
                  {item.step !== undefined && <span className="step-badge" aria-hidden="true">{item.step}</span>}
                  <span><Inlines nodes={item.title} title /></span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="prose">
          {children}
          <nav className="guide-pager" aria-label="Guide pages">
            {prev ? <a href={prev.href}><span>Previous</span>{prev.label}</a> : <span />}
            {next && <a className="guide-pager__next" href={next.href}><span>Next</span>{next.label}</a>}
          </nav>
        </article>
      </div>
    </div>
  );
}

/** The note under each guide page's title saying where its numbers come from. */
export function CountedNote({ version, digest }: { version: string | null; digest: string }) {
  return (
    <p className="counted-note">
      Numbers about the catalog are counted from Knowledge Library {version ?? ''} (digest <code>{digest.slice(0, 12)}</code>)
      when the site is built. Hover over or tap one to see what it counts.
    </p>
  );
}
