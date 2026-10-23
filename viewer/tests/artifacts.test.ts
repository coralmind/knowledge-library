import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ingest } from '../scripts/ingest';
import type { QuarantinedEntry } from '../src/lib/quarantine';
import { makeLibrary } from './fixtures/make-library';

/** Keeps these tests independent of the real quarantine list. */
const NO_QUARANTINE: readonly QuarantinedEntry[] = [];

async function withArtifacts() {
  const outDir = mkdtempSync(join(tmpdir(), 'kl-art-'));
  ingest({ outDir, source: makeLibrary(), quarantine: NO_QUARANTINE });
  // `vi.stubEnv`, never direct assignment: restoring `undefined` to a
  // `process.env` key sets the string "undefined" instead of deleting it.
  vi.stubEnv('KL_GENERATED_DIR', outDir);
  return await import('../src/lib/artifacts');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('artifacts', () => {
  it('loads the index', async () => {
    const artifacts = await withArtifacts();
    expect(artifacts.loadIndex()).toHaveLength(3);
  });

  it('lists entry ids', async () => {
    const artifacts = await withArtifacts();
    expect(artifacts.entryIds().sort()).toEqual(['kl-900001', 'kl-900002', 'kl-900003']);
  });

  it('loads a redacted entry', async () => {
    const artifacts = await withArtifacts();
    expect(artifacts.loadPublicEntry('kl-900001')._internal).toBeUndefined();
  });

  it('loads a full entry', async () => {
    const artifacts = await withArtifacts();
    expect(artifacts.loadPrivateEntry('kl-900001')._internal).toBeDefined();
  });

  it('explains how to fix a missing artifact directory', async () => {
    vi.stubEnv('KL_GENERATED_DIR', join(tmpdir(), 'kl-not-generated'));
    const artifacts = await import('../src/lib/artifacts');
    expect(() => artifacts.loadIndex()).toThrow(/npm run ingest/);
  });

  it('names the id when an entry artifact is absent', async () => {
    const artifacts = await withArtifacts();
    expect(() => artifacts.loadPublicEntry('kl-999999')).toThrow(/kl-999999/);
  });
});
