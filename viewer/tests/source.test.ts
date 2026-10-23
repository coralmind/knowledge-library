import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveSchemaDir, resolveSource } from '../src/lib/source';

describe('resolveSource', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the repo checkout beside viewer/', () => {
    const source = resolveSource();
    expect(source.entriesDir).toBe(resolve(process.cwd(), '..', 'entries'));
  });

  it('honours the environment overrides', () => {
    const root = mkdtempSync(join(tmpdir(), 'kl-source-'));
    mkdirSync(join(root, 'e'));
    vi.stubEnv('KL_ENTRIES_DIR', join(root, 'e'));

    const source = resolveSource();
    expect(source.entriesDir).toBe(join(root, 'e'));
  });

  it('throws a message naming the override when the directory is missing', () => {
    vi.stubEnv('KL_ENTRIES_DIR', join(tmpdir(), 'definitely-not-here-kl'));
    expect(() => resolveSource()).toThrow(/KL_ENTRIES_DIR/);
  });
});

describe('resolveSchemaDir', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('honours KL_SCHEMA_DIR', () => {
    const root = mkdtempSync(join(tmpdir(), 'kl-schema-'));
    mkdirSync(join(root, 's'));
    vi.stubEnv('KL_SCHEMA_DIR', join(root, 's'));

    expect(resolveSchemaDir()).toBe(join(root, 's'));
  });
});
