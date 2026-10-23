import { describe, expect, it } from 'vitest';
import { parseEntries, toIndexRow } from '../src/lib/parse';
import type { QuarantinedEntry } from '../src/lib/quarantine';
import { makeLibrary, writeInvalidEntry, writeInvalidEntryAt } from './fixtures/make-library';

/** Keeps these tests independent of the real quarantine list. */
const NO_QUARANTINE: readonly QuarantinedEntry[] = [];

describe('parseEntries', () => {
  it('reads every entry across directories', () => {
    const source = makeLibrary();
    const { entries } = parseEntries(source, NO_QUARANTINE);
    expect(entries.map((e) => e.id).sort()).toEqual(['kl-900001', 'kl-900002', 'kl-900003']);
  });

  it('assigns the type from the directory, mapping person_context to context', () => {
    const source = makeLibrary();
    const { entries } = parseEntries(source, NO_QUARANTINE);
    const context = entries.find((e) => e.id === 'kl-900003');
    expect(context?.type).toBe('context');
  });

  it('keeps internal fields at this stage; redaction happens later', () => {
    const source = makeLibrary();
    const { entries } = parseEntries(source, NO_QUARANTINE);
    expect(entries.find((e) => e.id === 'kl-900001')?.data._internal).toBeDefined();
  });

  it('reports nothing quarantined when nothing is', () => {
    const source = makeLibrary();
    expect(parseEntries(source, NO_QUARANTINE).quarantined).toEqual([]);
  });

  it('throws naming the file and the failing instance path', () => {
    const source = makeLibrary();
    writeInvalidEntry(source.entriesDir);
    expect(() => parseEntries(source, NO_QUARANTINE)).toThrow(/kl-900099\.yaml/);
    expect(() => parseEntries(source, NO_QUARANTINE)).toThrow(/id/);
  });

  it('reports every failing file in one throw, not just the first', () => {
    const source = makeLibrary();
    writeInvalidEntry(source.entriesDir);
    writeInvalidEntryAt(source.entriesDir, 'impacts/kl-900098.yaml');

    // The walk is alphabetical, so a throw on the first failure would name only impacts/.
    expect(() => parseEntries(source, NO_QUARANTINE)).toThrow(/2 entries fail their schemas/);
    expect(() => parseEntries(source, NO_QUARANTINE)).toThrow(/kl-900098\.yaml/);
    expect(() => parseEntries(source, NO_QUARANTINE)).toThrow(/kl-900099\.yaml/);
  });
});

describe('toIndexRow', () => {
  it('projects only the catalog fields', () => {
    const source = makeLibrary();
    const { entries } = parseEntries(source, NO_QUARANTINE);
    const pathway = entries.find((e) => e.id === 'kl-900001')!;
    expect(toIndexRow(pathway)).toEqual({
      id: 'kl-900001',
      display_id: 'Pathway-900001',
      type: 'pathway',
      label: 'A synthetic pathway for tests',
      composition_type: 'direct',
      standing: 'theorized',
      status: 'draft',
    });
  });

  it('uses null rather than omitting fields an entry type lacks', () => {
    const source = makeLibrary();
    const { entries } = parseEntries(source, NO_QUARANTINE);
    const row = toIndexRow(entries.find((e) => e.id === 'kl-900002')!);
    expect(row.composition_type).toBe(null);
    expect(row.standing).toBe(null);
    expect(row.status).toBe('active');
  });
});
