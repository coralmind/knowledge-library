import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveSchemaDir, resolveSource } from '../src/lib/source';
import {
  DIR_TO_TYPE,
  ENTRY_TYPES,
  LIFECYCLE_STATUSES,
  TYPE_LABELS,
} from '../src/lib/types';

describe('entry type table', () => {
  it('covers all thirteen types', () => {
    expect(ENTRY_TYPES).toHaveLength(13);
    expect(ENTRY_TYPES).toContain('experience_cluster');
    expect(ENTRY_TYPES).toContain('context_value');
    expect(ENTRY_TYPES).toContain('source');
  });

  it('labels every type', () => {
    for (const type of ENTRY_TYPES) {
      expect(TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it('gives every type its own hue', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/site.css'), 'utf8');
    const tokens = readFileSync(join(process.cwd(), 'src/styles/app-tokens.css'), 'utf8');
    for (const type of ENTRY_TYPES) {
      expect(css, type).toContain(`[data-type='${type}']`);
      expect(tokens, type).toContain(`--type-${type.replaceAll('_', '-')}:`);
    }
  });

  it('maps person_context to the context type', () => {
    // The one directory whose name does not match its `type`.
    expect(DIR_TO_TYPE.person_context).toBe('context');
  });

  /** Reads the real entries/ directory, so a new entry type fails until the table is updated. */
  it('maps exactly the directories that exist in entries/', () => {
    const { entriesDir } = resolveSource();
    const actual = readdirSync(entriesDir, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .sort();

    expect(Object.keys(DIR_TO_TYPE).sort()).toEqual(actual);
  });

  it('maps every directory to a declared entry type', () => {
    for (const type of Object.values(DIR_TO_TYPE)) {
      expect(ENTRY_TYPES).toContain(type);
    }
  });

  /**
   * The two tests above both pass for a swapped mapping such as
   * `experience_clusters -> 'mechanism'`. Requiring distinct types catches it.
   */
  it('maps each directory to a distinct type', () => {
    expect(new Set(Object.values(DIR_TO_TYPE)).size).toBe(Object.keys(DIR_TO_TYPE).length);
  });
});

/**
 * `LIFECYCLE_STATUSES` is a hand-written copy of the `LifecycleStatus` enum in
 * `schema/`. A missing member would silently turn `?status=<value>` into a
 * no-op and drop its checkbox.
 */
describe('lifecycle vocabulary', () => {
  /** `$defs.LifecycleStatus.enum`, as pydantic emits it. */
  function schemaStatuses(file: string): string[] | null {
    const schema = JSON.parse(readFileSync(file, 'utf-8')) as {
      $defs?: { LifecycleStatus?: { enum?: unknown } };
    };
    const values = schema.$defs?.LifecycleStatus?.enum;
    return Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string') : null;
  }

  it('matches the LifecycleStatus enum in every entry schema', () => {
    const schemaDir = resolveSchemaDir();
    const files = readdirSync(schemaDir).filter((name) => name.endsWith('.schema.json'));
    const found = files
      .map((name) => ({ name, statuses: schemaStatuses(join(schemaDir, name)) }))
      .filter((schema): schema is { name: string; statuses: string[] } => schema.statuses !== null);

    // Every schema that has a lifecycle, so new entry types are covered automatically.
    for (const { name, statuses } of found) {
      expect(statuses, `${name} pins a different lifecycle vocabulary`).toEqual([
        ...LIFECYCLE_STATUSES,
      ]);
    }

    // And the count, so agreement over zero schemas cannot pass.
    expect(found.length).toBe(files.length);
  });
});
