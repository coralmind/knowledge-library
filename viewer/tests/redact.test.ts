import { describe, expect, it } from 'vitest';
import { findInternalKeys, isInternalKey, redact } from '../src/lib/redact';

/**
 * DO NOT DELETE THIS FILE. `redact` draws the public/private file boundary.
 * The models accept any `_`-prefixed key, so this is a prefix rule, never a
 * list.
 */
describe('isInternalKey', () => {
  it('is true for a leading underscore and false otherwise', () => {
    expect(isInternalKey('_note')).toBe(true);
    expect(isInternalKey('_')).toBe(true);
    expect(isInternalKey('display_id')).toBe(false);
    expect(isInternalKey('')).toBe(false);
  });
});

describe('redact', () => {
  it('drops top-level underscore keys and keeps the rest', () => {
    expect(redact({ id: 'kl-000039', _note: 'internal reasoning' })).toEqual({
      id: 'kl-000039',
    });
  });

  it('drops nested underscore keys at any depth', () => {
    const input = {
      standing: {
        value: 'plausible_unobserved',
        _detail: { c1: { standing: 'theorized' } },
        nested: { deeper: { _rule: 'internal', kept: true } },
      },
    };

    expect(redact(input)).toEqual({
      standing: { value: 'plausible_unobserved', nested: { deeper: { kept: true } } },
    });
  });

  it('drops underscore keys inside arrays of objects', () => {
    const input = {
      sources: [
        { source: 'kl-000004', _note: 'internal' },
        { source: 'kl-000010', _internal: 'internal' },
      ],
    };

    expect(redact(input)).toEqual({
      sources: [{ source: 'kl-000004' }, { source: 'kl-000010' }],
    });
  });

  it('drops a key that is exactly one underscore', () => {
    expect(redact({ _: 'x', keep: 1 })).toEqual({ keep: 1 });
  });

  it('keeps underscores that are not leading', () => {
    expect(redact({ display_id: 'Pathway-1', onset_mode: 'foregone' })).toEqual({
      display_id: 'Pathway-1',
      onset_mode: 'foregone',
    });
  });

  it('does not mutate its input', () => {
    const input = { id: 'a', _note: 'b', nested: { _x: 1, y: 2 } };
    redact(input);
    expect(input._note).toBe('b');
    expect(input.nested._x).toBe(1);
  });

  it('returns a deep copy, sharing no subtree with its input', () => {
    const input = { id: 'a', nested: { y: 2, deeper: { z: [1] } } };
    const out = redact(input);
    expect(out).not.toBe(input);
    expect(out.nested).not.toBe(input.nested);
    expect(out.nested.deeper).not.toBe(input.nested.deeper);
    expect(out.nested.deeper.z).not.toBe(input.nested.deeper.z);
  });

  it('passes primitives, null and arrays of scalars through unchanged', () => {
    expect(redact(null)).toBe(null);
    expect(redact('text')).toBe('text');
    expect(redact([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('accepts a prototype-less object, which is what a null proto looks like', () => {
    const bag = Object.create(null) as Record<string, unknown>;
    bag.keep = 1;
    bag._note = 'x';
    expect(redact(bag)).toEqual({ keep: 1 });
  });
});

describe('findInternalKeys', () => {
  it('reports nothing for clean data', () => {
    expect(findInternalKeys({ a: { b: [{ c: 1 }] } })).toEqual([]);
  });

  it('reports the path to every offending key', () => {
    const found = findInternalKeys({
      _note: 1,
      body: { composition_parts: [{ _note: 2 }] },
    });
    expect(found).toEqual(['_note', 'body.composition_parts[0]._note']);
  });
});

/**
 * `redact` and `findInternalKeys` encode one rule in two traversals, and the
 * post-build scan runs the second over the first's output, so they must agree.
 */
describe('redact and findInternalKeys agree', () => {
  it('leaves nothing for findInternalKeys to report', () => {
    const dirty = {
      _note: 'x',
      display_id: 'Pathway-1',
      rows: [[{ _note: 'a' }], [{ keep: 1, _note: 'b' }]],
      standing: { _detail: { c1: { _rule: 'y' } }, value: 'z' },
      _: 'bare',
    };
    expect(findInternalKeys(dirty).length).toBeGreaterThan(0);
    expect(findInternalKeys(redact(dirty))).toEqual([]);
  });
});

/**
 * A shape whose value would silently vanish. Both traversals must refuse it:
 * `redact` writes the public file and `findInternalKeys` checks it.
 */
describe.each([
  ['redact', redact],
  ['findInternalKeys', findInternalKeys],
] as const)('%s rejects shapes it cannot copy', (_name, fn) => {
  it('throws on a Date, naming the type', () => {
    expect(() => fn({ generatedAt: new Date('2026-08-22') })).toThrow(TypeError);
    expect(() => fn({ generatedAt: new Date('2026-08-22') })).toThrow(/Date/);
  });

  it('throws on a Map, naming the type', () => {
    expect(() => fn(new Map([['a', 1]]))).toThrow(TypeError);
    expect(() => fn(new Map([['a', 1]]))).toThrow(/Map/);
  });

  it('throws on a function, which is not typeof object', () => {
    expect(() => fn({ render: () => 'x' })).toThrow(TypeError);
    expect(() => fn({ render: () => 'x' })).toThrow(/function/);
    expect(() => fn(() => 'x')).toThrow(/function/);
  });
});
