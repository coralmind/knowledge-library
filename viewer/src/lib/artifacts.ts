/**
 * The single place generated library data is read. Do not add a second
 * reader, a fixture, or inlined entry data anywhere in viewer/.
 *
 * `loadPrivateEntry` is exported but has no callers yet; it lives here so both
 * tiers are read through one module.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowseRow } from './browse';
import type { Link } from './links';
import type { IndexRow, LibraryMeta } from './types';

/**
 * Anchored to the working directory rather than `import.meta.url`, because
 * bundlers move this module into build output. npm runs scripts from `viewer/`.
 */
function generatedDir(): string {
  return process.env.KL_GENERATED_DIR ?? join(process.cwd(), 'src', 'generated');
}

/** Throws with the fix (`npm run ingest`) when an artifact is missing, as on a fresh checkout. */
function read<T>(...segments: string[]): T {
  const path = join(generatedDir(), ...segments);
  if (!existsSync(path)) {
    throw new Error(
      `Could not read generated library data at ${path}.\n\n` +
        `The viewer builds from current entries and keeps no copy of its own, ` +
        `so the artifacts have to be generated before a build:\n\n` +
        `    npm run ingest\n`,
    );
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

export function loadIndex(): IndexRow[] {
  return read<IndexRow[]>('index.public.json');
}

let browseRows: BrowseRow[] | null = null;

/** The catalog's rows, built at ingest from redacted bodies; read once per process. */
export function loadBrowse(): BrowseRow[] {
  browseRows ??= read<BrowseRow[]>('browse.public.json');
  return browseRows;
}

export function loadMeta(): LibraryMeta {
  return read<LibraryMeta>('meta.json');
}

let graph: { links: Link[]; dangling: Link[] } | null = null;

/**
 * Every link between entries, built at ingest from redacted bodies; read once
 * per process. `dangling` holds links whose target is not in the library.
 */
export function loadGraph(): { links: Link[]; dangling: Link[] } {
  graph ??= read<{ links: Link[]; dangling: Link[] }>('graph.public.json');
  return graph;
}

/** The redacted body: every `_`-prefixed field already removed at ingest. */
export function loadPublicEntry(id: string): Record<string, unknown> {
  return read<Record<string, unknown>>('entry', `${id}.public.json`);
}

/** The full, unredacted body. Must never be read by a public page. */
export function loadPrivateEntry(id: string): Record<string, unknown> {
  return read<Record<string, unknown>>('entry', `${id}.private.json`);
}

export function entryIds(): string[] {
  const dir = join(generatedDir(), 'entry');
  if (!existsSync(dir)) {
    throw new Error(`No entry artifacts at ${dir}. Run: npm run ingest`);
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith('.public.json'))
    .map((name) => name.replace(/\.public\.json$/, ''));
}
