'use client';

/**
 * A client component because the active link needs `usePathname`. It is
 * still server-rendered, so `aria-current` is in the initial HTML. No entry
 * data crosses this boundary; search results come from `/api/search`.
 */
import { usePathname } from 'next/navigation';
import logo from '@coralmind/brand/assets/logo/primary-color.svg';
import { GitHubIcon, NAV_LINKS, REPO_URL } from './nav';
import { SearchBox } from './SearchBox';

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href) || (href === '/catalog' && pathname.startsWith('/entry'));

  return (
    <header className="cm-site-header site-header">
      <div className="cm-site-header__inner">
        <a className="cm-site-header__brand site-header__brand" href="/">
          {/* Imports as a plain string URL in Next, not StaticImageData. */}
          <img src={logo} alt="CoralMind" width="150" height="36" />
          <span className="site-header__name">Knowledge Library</span>
        </a>
        <SearchBox />
        <nav className="cm-site-header__nav" aria-label="Main">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className={isActive(href) ? 'cm-is-active' : undefined}
              aria-current={isActive(href) ? 'page' : undefined}
            >
              {label}
            </a>
          ))}
          <a
            href={REPO_URL}
            className="site-header__github"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="The Knowledge Library on GitHub (opens in a new tab)"
          >
            <GitHubIcon />
          </a>
        </nav>
      </div>
    </header>
  );
}
