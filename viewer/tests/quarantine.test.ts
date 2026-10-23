/**
 * The quarantine is the one place the parser keeps going past a schema
 * violation. An unlisted failure must still stop the build, and so must a
 * listed file that passes or no longer exists. The list is injected into
 * `parseEntries` rather than mocked.
 */
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { parseEntries } from '../src/lib/parse';
import { isQuarantined, matches, QUARANTINE, type QuarantinedEntry } from '../src/lib/quarantine';
import { makeLibrary, writeInvalidEntryAt } from './fixtures/make-library';

const BROKEN = 'pathways/kl-900099.yaml';

function listing(...paths: string[]): readonly QuarantinedEntry[] {
  return paths.map((path) => ({ path, reason: 'Synthetic fixture, invalid on purpose.' }));
}

describe('quarantined files', () => {
  /** Every parse prints the list; silenced here and asserted by the printout test. */
  let warn: MockInstance<typeof console.warn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('excludes a listed invalid file instead of throwing', () => {
    const source = makeLibrary();
    writeInvalidEntryAt(source.entriesDir, BROKEN);

    const { entries } = parseEntries(source, listing(BROKEN));

    expect(entries.map((e) => e.id).sort()).toEqual(['kl-900001', 'kl-900002', 'kl-900003']);
  });

  it('returns the excluded paths so a caller can report the shortfall', () => {
    const source = makeLibrary();
    writeInvalidEntryAt(source.entriesDir, BROKEN);

    expect(parseEntries(source, listing(BROKEN)).quarantined).toEqual([BROKEN]);
  });

  it('still throws for an invalid file that is not listed', () => {
    const source = makeLibrary();
    writeInvalidEntryAt(source.entriesDir, BROKEN);

    // A non-empty list naming a different file that is on disk.
    const other = listing('impacts/kl-900098.yaml');
    writeInvalidEntryAt(source.entriesDir, 'impacts/kl-900098.yaml');

    expect(() => parseEntries(source, other)).toThrow(/kl-900099\.yaml/);
    expect(() => parseEntries(source, other)).toThrow(/must have required property 'id'/);
  });

  it('throws when a listed file passes validation, so the list must shrink', () => {
    const source = makeLibrary();

    // kl-900001 is valid: it stands in for a fixed entry left on the list.
    expect(() => parseEntries(source, listing('pathways/kl-900001.yaml'))).toThrow(
      /pathways\/kl-900001\.yaml passes validation but is still quarantined/,
    );
    expect(() => parseEntries(source, listing('pathways/kl-900001.yaml'))).toThrow(
      /Remove it from QUARANTINE/,
    );
  });

  it('throws when a listed path matches no file, so the list cannot rot that way either', () => {
    const source = makeLibrary();
    writeInvalidEntryAt(source.entriesDir, BROKEN);

    // A renumbered or deleted entry leaves a line that matches nothing.
    const stale = listing(BROKEN, 'impacts/kl-900098.yaml');
    expect(() => parseEntries(source, stale)).toThrow(/impacts\/kl-900098\.yaml/);
    expect(() => parseEntries(source, stale)).toThrow(/no longer exists/);
  });

  it('prints the list and its count on every parse', () => {
    const source = makeLibrary();
    writeInvalidEntryAt(source.entriesDir, BROKEN);

    parseEntries(source, listing(BROKEN));
    parseEntries(source, listing(BROKEN));

    expect(warn).toHaveBeenCalledTimes(2);
    const printed = String(warn.mock.calls[0]?.[0]);
    expect(printed).toContain('QUARANTINE: 1 entry excluded');
    expect(printed).toContain(BROKEN);
    expect(printed).toContain('Synthetic fixture, invalid on purpose.');
  });

  it('counts what it excluded, not what the list configured', () => {
    const source = makeLibrary();
    writeInvalidEntryAt(source.entriesDir, BROKEN);

    // Two listed, one on disk: the printout reports the one.
    expect(() => parseEntries(source, listing(BROKEN, 'impacts/kl-900098.yaml'))).toThrow();
    expect(String(warn.mock.calls[0]?.[0])).toContain('QUARANTINE: 1 entry excluded');
  });
});

describe('matches', () => {
  const list = listing('pathways/kl-000077.yaml');

  it('matches a listed path', () => {
    expect(matches(list, 'pathways/kl-000077.yaml')).toBeDefined();
  });

  it('does not match the same file name in another directory', () => {
    expect(matches(list, 'ai_behaviors/kl-000077.yaml')).toBeUndefined();
  });

  it('does not match on the basename alone', () => {
    expect(matches(list, 'kl-000077.yaml')).toBeUndefined();
  });

  it('does not match an unlisted path', () => {
    expect(matches(list, 'pathways/kl-000078.yaml')).toBeUndefined();
  });
});

describe('isQuarantined', () => {
  it('reads the real list, which is empty while every entry validates', () => {
    expect(isQuarantined('pathways/kl-000077.yaml')).toBe(false);
  });
});

describe('QUARANTINE', () => {
  it('gives every path a reason and lists each path once', () => {
    for (const entry of QUARANTINE) {
      expect(entry.path).toMatch(/^[a-z_]+\/kl-\d{6}\.yaml$/);
      expect(entry.reason.length).toBeGreaterThan(20);
    }
    expect(new Set(QUARANTINE.map((e) => e.path)).size).toBe(QUARANTINE.length);
  });
});
