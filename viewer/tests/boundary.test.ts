/**
 * The public/private boundary, pinned in source.
 *
 * Public pages open only redacted artifacts, and `src/lib/artifacts.ts` is the
 * only module that opens `src/generated/`. The post-build scripts check one
 * build's output; these tests check the source rules that output depends on,
 * which `tsc` and the other tests cannot see:
 *
 *   - A `loadPrivateEntry` call in the catalog is invisible to the post-build
 *     scanner, because `/catalog` reads searchParams and has no prerendered output.
 *   - `resolveJsonModule: true` makes importing a `src/generated/` JSON file
 *     legal; the bundler inlines it, so it never appears in a trace manifest.
 *
 * Allowlists with exact set equality, so any new reader shows up as an
 * explicit line in a diff.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const VIEWER_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Posix-style path relative to `viewer/`, so failure messages are stable. */
function repoPath(absolute: string): string {
  return relative(VIEWER_ROOT, absolute).split(sep).join('/');
}

/** Comments are stripped before scanning, so prose that names a rule does not trip it. */
function readCode(path: string): string {
  return readFileSync(join(VIEWER_ROOT, path), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceFiles(dir: string): string[] {
  return readdirSync(join(VIEWER_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const child = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(child);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [repoPath(join(VIEWER_ROOT, child))] : [];
  });
}

/** Every source file under `dirs` whose code matches any of `patterns`. */
function matching(dirs: string[], patterns: RegExp[]): string[] {
  return dirs
    .flatMap((dir) => sourceFiles(dir))
    .filter((path) => {
      const code = readCode(path);
      return patterns.some((pattern) => pattern.test(code));
    })
    .sort();
}

const CALLS_LOAD_PRIVATE_ENTRY = [/\bloadPrivateEntry\b/];

/** A quoted path segment or the env override, never the bare word (`types.ts` has `generated_at`). */
const REACHES_INTO_GENERATED = [
  /(['"`])[^'"`]*\bgenerated\/[^'"`]*\1/,
  /['"]generated['"]/,
  /\bKL_GENERATED_DIR\b/,
];

const IMPORTS_FROM_GENERATED = [/(?:from|import|require)\s*\(?\s*['"][^'"]*generated\//];

/**
 * What makes a route render at request time. `export const dynamic\s*=` so the
 * entry route's `dynamicParams = false` does not match.
 */
const RENDERS_AT_REQUEST_TIME = [
  /\bsearchParams\b/,
  /\bcookies\s*\(/,
  /\bheaders\s*\(/,
  /\bdraftMode\s*\(/,
  /export\s+const\s+dynamic\s*=/,
  /export\s+const\s+revalidate\s*=/,
];

/** Files that may call `loadPrivateEntry`. Empty: no route reads unredacted data. */
const PRIVATE_READERS: string[] = [];

const WHY_PRIVATE_READERS =
  'A page or component now calls loadPrivateEntry, which returns the ' +
  'unredacted entry body, internal `_`-prefixed fields included. Nothing ' +
  'under src/app/ or src/components/ may call it except a ' +
  'session-checked route. Note that the post-build leak scanner would NOT ' +
  'catch this on the catalog: `/catalog` reads searchParams, so it is dynamic and has ' +
  'no prerendered output to scan. If the call is deliberate and the route ' +
  'checks a session, add the file to PRIVATE_READERS in tests/boundary.test.ts ' +
  'with a note saying which check gates it -- do not delete the assertion.';

/** Files that may reach into `src/generated/` at all. */
const GENERATED_READERS = ['src/lib/artifacts.ts'];

const WHY_GENERATED_READERS =
  'A module other than src/lib/artifacts.ts now reaches into src/generated/. ' +
  'That directory holds both tiers, so a second reader is a second place the ' +
  'private one can be opened, and it is the drift the one-way data rule exists ' +
  'to prevent. Read through src/lib/artifacts.ts instead. If a new reader is ' +
  'genuinely necessary, add it to GENERATED_READERS in tests/boundary.test.ts ' +
  'and say why one module was not enough.';

/**
 * Dynamic routes, which produce no build-time output for the post-build
 * scanner to read. The catalog, Explore and the search endpoint are dynamic
 * because they read `searchParams`.
 */
const DYNAMIC_ROUTES = [
  'src/app/catalog/page.tsx',
  'src/app/explore/page.tsx',
  // The header's live search; reads only the public catalog rows.
  'src/app/api/search/route.ts',
];

const WHY_DYNAMIC_ROUTES =
  'A route under src/app/ became dynamic -- it reads searchParams, cookies or ' +
  'headers, or sets `export const dynamic`. Dynamic routes render at request ' +
  'time, so scripts/assert-no-internal-fields.ts never sees their output and ' +
  'cannot vouch for them: whatever this route reads, no build-time check will ' +
  'notice if it reads the wrong tier. Add it to DYNAMIC_ROUTES in ' +
  'tests/boundary.test.ts, and say what does check it.';

describe('public/private boundary', () => {
  it('has exactly the expected callers of loadPrivateEntry', () => {
    // app/ and components/ only: `src/lib/artifacts.ts` declares the function.
    const found = matching(['src/app', 'src/components'], CALLS_LOAD_PRIVATE_ENTRY);

    expect(found, WHY_PRIVATE_READERS).toEqual([...PRIVATE_READERS].sort());
  });

  it('has exactly the expected readers of src/generated', () => {
    const found = matching(['src'], REACHES_INTO_GENERATED);

    expect(found, WHY_GENERATED_READERS).toEqual([...GENERATED_READERS].sort());
  });

  /** An import is inlined by the bundler, so the trace check cannot see it. */
  it('imports no module from src/generated', () => {
    const found = matching(['src'], IMPORTS_FROM_GENERATED);

    expect(
      found,
      'A module is imported from src/generated/. resolveJsonModule makes that ' +
        'legal and typed, and it is worse than reading the file: the JSON is ' +
        'inlined into the bundle, so the tracing exclude in next.config.ts ' +
        'cannot keep it out and the trace manifests show nothing. Read through ' +
        'src/lib/artifacts.ts, which opens the file at runtime.',
    ).toEqual([]);
  });

  it('has exactly the expected dynamic routes', () => {
    const found = matching(['src/app'], RENDERS_AT_REQUEST_TIME);

    expect(found, WHY_DYNAMIC_ROUTES).toEqual([...DYNAMIC_ROUTES].sort());
  });
});
