import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultOutDir, ingest } from '../scripts/ingest';
import type { QuarantinedEntry } from '../src/lib/quarantine';
import { findInternalKeys } from '../src/lib/redact';
import type { LibrarySource } from '../src/lib/source';
import { editEntryDefinition, makeLibrary, writeInvalidEntryAt } from './fixtures/make-library';

/** Keeps these tests independent of the real quarantine list. */
const NO_QUARANTINE: readonly QuarantinedEntry[] = [];

/** Ingests into a caller-supplied directory, which may already hold artifacts. */
function runIn(outDir: string, source: LibrarySource = makeLibrary(), quarantine = NO_QUARANTINE) {
  const meta = ingest({ outDir, source, quarantine });
  const read = (name: string) => JSON.parse(readFileSync(join(outDir, name), 'utf-8'));
  return { meta, outDir, read };
}

function run(source: LibrarySource = makeLibrary(), quarantine = NO_QUARANTINE) {
  return runIn(mkdtempSync(join(tmpdir(), 'kl-out-')), source, quarantine);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ingest', () => {
  it('writes an index row per entry', () => {
    const { read } = run();
    expect(read('index.public.json')).toHaveLength(3);
  });

  it('writes a public and a private artifact per entry', () => {
    const { outDir } = run();
    const names = readdirSync(join(outDir, 'entry')).sort();
    expect(names).toContain('kl-900001.public.json');
    expect(names).toContain('kl-900001.private.json');
    expect(names).toHaveLength(6);
  });

  /** Needs a pre-populated directory, or a merge would pass too. */
  it('clears the output directory, so an artifact of a deleted entry cannot survive', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'kl-out-'));
    mkdirSync(join(outDir, 'entry'), { recursive: true });
    writeFileSync(join(outDir, 'entry', 'kl-999999.public.json'), '{"id":"kl-999999"}\n', 'utf-8');
    writeFileSync(join(outDir, 'index.public.json'), '["stale junk"]\n', 'utf-8');

    const { read } = runIn(outDir);

    expect(existsSync(join(outDir, 'entry', 'kl-999999.public.json'))).toBe(false);
    const rows = read('index.public.json') as { id: string }[];
    expect(rows.map((r) => r.id).sort()).toEqual(['kl-900001', 'kl-900002', 'kl-900003']);
  });

  /** Do not delete or weaken this assertion. */
  it('leaves no internal key in any public artifact', () => {
    const { outDir, read } = run();
    const publicFiles = [
      'index.public.json',
      'graph.public.json',
      'browse.public.json',
      ...readdirSync(join(outDir, 'entry'))
        .filter((n) => n.endsWith('.public.json'))
        .map((n) => join('entry', n)),
    ];

    for (const name of publicFiles) {
      expect(findInternalKeys(read(name)), `internal keys leaked into ${name}`).toEqual([]);
    }
  });

  it('keeps every internal key in the private artifact', () => {
    const { read } = run();
    const full = read(join('entry', 'kl-900001.private.json'));
    expect(full._internal).toBeDefined();
    expect(full.body._note).toBe('internal');
    expect(full.standing._detail).toBeDefined();
  });

  it('includes draft entries, because drafts are public', () => {
    const { read } = run();
    const rows = read('index.public.json') as { id: string; status: string }[];
    expect(rows.find((r) => r.id === 'kl-900001')?.status).toBe('draft');
  });

  it('writes every link between entries into the graph', () => {
    const { read } = run();
    const graph = read('graph.public.json') as { links: { kind: string; from: string; to: string }[] };
    expect(graph.links.map(({ kind, from, to }) => ({ kind, from, to }))).toEqual([
      { kind: 'impacts', from: 'kl-900001', to: 'kl-900002' },
    ]);
  });

  /**
   * Intended: a link to an id the library does not hold is kept apart, not
   * dropped, so a stated relationship is never silently erased.
   */
  it('keeps links to missing entries apart as dangling', () => {
    const { read } = run();
    const graph = read('graph.public.json') as { dangling: { kind: string; to: string; attrs: { role?: string } }[] };
    // `kl-900004` and `kl-900005` are deliberately not fixture entries.
    expect(graph.dangling.map((l) => [l.to, l.attrs.role])).toEqual([
      ['kl-900004', 'originator'],
      ['kl-900005', 'condition'],
    ]);
  });

  it('reports a stable digest that changes with content', () => {
    const first = run().meta.digest;
    const second = run().meta.digest;
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);

    // Same ids and files, one edited body.
    const edited = makeLibrary();
    editEntryDefinition(edited.entriesDir, 'pathways/kl-900001.yaml', 'Invented content, edited.');
    expect(run(edited).meta.digest).not.toBe(first);
  });

  it('counts entries by type', () => {
    const { meta } = run();
    expect(meta.counts).toEqual({ pathway: 1, impact: 1, context: 1 });
    expect(meta.quarantined).toEqual([]);
  });

  it('writes no artifact for a quarantined entry and names it in meta', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const source = makeLibrary();
    writeInvalidEntryAt(source.entriesDir, 'pathways/kl-900099.yaml');

    const { meta, outDir } = run(source, [
      { path: 'pathways/kl-900099.yaml', reason: 'invented, for this test' },
    ]);

    expect(readdirSync(join(outDir, 'entry')).filter((n) => n.startsWith('kl-900099'))).toEqual([]);
    expect(meta.quarantined).toEqual(['pathways/kl-900099.yaml']);
    expect(meta.counts).toEqual({ pathway: 1, impact: 1, context: 1 });
  });
});

describe('defaultOutDir', () => {
  it('writes under the viewer package when run from it', () => {
    expect(defaultOutDir(process.cwd())).toBe(join(process.cwd(), 'src', 'generated'));
  });

  it('refuses a directory that is not the viewer package', () => {
    // The repository root: only viewer/src/generated/ is gitignored.
    expect(() => defaultOutDir(join(process.cwd(), '..'))).toThrow(/Run this from viewer\//);
  });

  it('refuses a directory with no package.json at all', () => {
    expect(() => defaultOutDir(mkdtempSync(join(tmpdir(), 'kl-cwd-')))).toThrow(
      /not the viewer package/,
    );
  });
});
