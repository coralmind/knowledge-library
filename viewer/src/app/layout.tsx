/**
 * The brand stylesheet assigns everything to cascade layers, so this app's
 * unlayered CSS wins regardless of import order.
 *
 * This build MUST use Turbopack. Webpack rewrites the brand's
 * `@import ... layer(...)` rules into invalid `@media layer(...)`, and the
 * page renders completely unstyled with no error at all.
 */
import '@coralmind/brand/styles/index.css';
import '../styles/app-tokens.css';
import './site.css';
import '../styles/shell.css';
import '../styles/content.css';
import '../styles/home.css';
import '../styles/catalog.css';
import '../styles/entry.css';
import '../styles/explore.css';

import type { Metadata } from 'next';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ROBOTS_DIRECTIVES } from '../lib/robots';

export const metadata: Metadata = {
  title: 'CoralMind Knowledge Library',
  robots: ROBOTS_DIRECTIVES,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {/* Each page renders its own FeedbackBand, so an entry page can name the entry in it. */}
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
