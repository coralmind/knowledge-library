/**
 * The one bridge in the one-way data flow:
 *
 *     entries/ -> [this script] -> viewer/src/generated/ -> pages
 *
 * The output is gitignored, so a page can only be built from freshly ingested
 * entries.
 *
 * Each entry is written twice: a redacted `.public.json` and a full
 * `.private.json`. Public pages open only the redacted file, so an internal
 * field is absent from everything they read, rather than relying on a
 * render-time filter.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toBrowseRows } from '../src/lib/browse';
import { entryLinks } from '../src/lib/links';
import { parseEntries, toIndexRow, type ParsedEntry } from '../src/lib/parse';
import { QUARANTINE, type QuarantinedEntry } from '../src/lib/quarantine';
import { redact } from '../src/lib/redact';
import { resolveSource, type LibrarySource } from '../src/lib/source';
import type { EntryType, IndexRow, LibraryMeta } from '../src/lib/types';

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value)}\n`, 'utf-8');
}

/**
 * A content hash over ids and raw bodies of the ingested (non-quarantined)
 * entries, so a rendered page can state which library produced it. Sorted by
 * id so directory iteration order cannot change it.
 */
function digestOf(entries: ParsedEntry[]): string {
  const hash = createHash('sha256');
  for (const entry of [...entries].sort((a, b) => a.id.localeCompare(b.id))) {
    hash.update(entry.id);
    hash.update(JSON.stringify(entry.data));
  }
  return hash.digest('hex');
}

/** Best-effort read of the package version; absence is not an error. */
function packageVersion(): string | null {
  try {
    const pyproject = readFileSync(join(process.cwd(), '..', 'pyproject.toml'), 'utf-8');
    return /^version\s*=\s*"([^"]+)"/m.exec(pyproject)?.[1] ?? null;
  } catch {
    return null;
  }
}

const VIEWER_PACKAGE = 'coralmind-knowledge-library-viewer';

/**
 * The default output directory, which must be inside the viewer package.
 *
 * Only `viewer/src/generated/` is gitignored. Run from anywhere else (e.g. the
 * repo root with `KL_ENTRIES_DIR` set), a cwd-relative default would clear and
 * then write unredacted entry data into an unignored directory. An explicit
 * `outDir` passed to `ingest` is not checked.
 *
 * @param cwd Injectable so tests need not change the process working directory.
 */
export function defaultOutDir(cwd: string = process.cwd()): string {
  let name: unknown;
  try {
    name = (JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8')) as { name?: unknown }).name;
  } catch {
    name = undefined;
  }

  if (name !== VIEWER_PACKAGE) {
    throw new Error(
      `Refusing to write generated artifacts under ${cwd}.\n\n` +
        `That is not the viewer package (no package.json naming ` +
        `${VIEWER_PACKAGE}), and only viewer/src/generated/ is gitignored. ` +
        `Ingest writes the full, unredacted private tier, so writing it ` +
        `elsewhere leaves internal entry data untracked but unignored.\n\n` +
        `Run this from viewer/.`,
    );
  }
  return join(cwd, 'src', 'generated');
}

/**
 * @param quarantine Injectable so tests against a synthetic fixture are not
 *   rejected for real list entries that match no fixture file.
 */
export function ingest({
  outDir,
  source,
  quarantine = QUARANTINE,
}: {
  outDir: string;
  source?: LibrarySource;
  quarantine?: readonly QuarantinedEntry[];
}): LibraryMeta {
  const resolved = source ?? resolveSource();
  const { entries, quarantined } = parseEntries(resolved, quarantine);

  // Cleared rather than merged, so an artifact of a deleted entry cannot survive.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'entry'), { recursive: true });

  const index: IndexRow[] = [];
  const counts: Record<string, number> = {};
  const published: ({ id: string; type: EntryType } & Record<string, unknown>)[] = [];

  for (const entry of entries) {
    const row = toIndexRow(entry);
    index.push(row);
    counts[entry.type] = (counts[entry.type] ?? 0) + 1;

    const redacted = redact(entry.data);
    published.push({ ...redacted, id: entry.id, type: entry.type });
    writeJson(join(outDir, 'entry', `${entry.id}.public.json`), redacted);
    writeJson(join(outDir, 'entry', `${entry.id}.private.json`), entry.data);
  }

  const meta: LibraryMeta = {
    digest: digestOf(entries),
    version: packageVersion(),
    generated_at: new Date().toISOString(),
    counts,
    quarantined,
  };

  writeJson(join(outDir, 'index.public.json'), index);
  // Both built from the redacted bodies, so per-request routes never need an entry file.
  writeJson(join(outDir, 'graph.public.json'), entryLinks(published));
  writeJson(join(outDir, 'browse.public.json'), toBrowseRows(published));
  writeJson(join(outDir, 'meta.json'), meta);

  return meta;
}

if (process.argv[1]?.endsWith('ingest.ts')) {
  const meta = ingest({ outDir: defaultOutDir() });
  const total = Object.values(meta.counts).reduce((sum, n) => sum + n, 0);
  console.log(`Ingested ${total} entries (digest ${meta.digest.slice(0, 12)}).`);
}
