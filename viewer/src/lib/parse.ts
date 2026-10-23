/**
 * YAML on disk to validated entry objects.
 *
 * A schema violation fails the build; there is no lenient mode, matching the
 * Python loader. The schemas are the files generated from the pydantic models.
 *
 * The one exception is the explicit path list in `quarantine.ts`, printed on
 * every parse, which fails the build as soon as a listed file passes
 * validation or stops existing.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';
import { matches, QUARANTINE, type QuarantinedEntry } from './quarantine';
import { resolveSchemaDir, type LibrarySource } from './source';
import {
  DIR_TO_TYPE,
  LIFECYCLE_STATUSES,
  type EntryType,
  type IndexRow,
  type LifecycleStatus,
} from './types';

export interface ParsedEntry {
  id: string;
  type: EntryType;
  /** Absolute path, used in error messages so a failure is actionable. */
  path: string;
  data: Record<string, unknown>;
}

export interface ParsedLibrary {
  entries: ParsedEntry[];
  /** Quarantined paths (relative to entriesDir) that were excluded, so a page can report N of M. */
  quarantined: string[];
}

/** `pathway` -> `pathway.schema.json`. */
function schemaFileFor(type: EntryType): string {
  return `${type}.schema.json`;
}

/** Compiled once per process; Ajv compilation is the expensive part of an ingest. */
let validatorCache: Map<string, ValidateFunction> | null = null;

function validators(): Map<string, ValidateFunction> {
  validatorCache ??= buildValidators();
  return validatorCache;
}

function buildValidators(): Map<string, ValidateFunction> {
  const schemaDir = resolveSchemaDir();
  // `strict: false` because these schemas are pydantic output and carry
  // keywords Ajv's strict mode rejects as unknown; `allErrors` so one build
  // reports every violation instead of only the first.
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);

  const validators = new Map<string, ValidateFunction>();
  for (const file of readdirSync(schemaDir).filter((n) => n.endsWith('.schema.json'))) {
    const schema = JSON.parse(readFileSync(join(schemaDir, file), 'utf-8')) as object;
    validators.set(file, ajv.compile(schema));
  }
  return validators;
}

function yamlFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.yaml'))
    .sort()
    .map((name) => join(dir, name));
}

/**
 * The violations for one file, or null when it validates. A missing schema is
 * not a content failure and still throws: it means schema/ is incomplete.
 */
function validationFailure(
  validate: ValidateFunction | undefined,
  data: unknown,
  path: string,
): string | null {
  if (validate === undefined) {
    throw new Error(`No schema found for ${path}. Is schema/ complete?`);
  }
  if (validate(data)) return null;

  const detail = (validate.errors ?? [])
    .map((error) => `  ${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
    .join('\n');
  return `Schema validation failed for ${basename(path)}:\n${detail}\n\n(${path})`;
}

function validateOrThrow(
  validate: ValidateFunction | undefined,
  data: unknown,
  path: string,
): void {
  const failure = validationFailure(validate, data, path);
  if (failure !== null) throw new Error(failure);
}

/**
 * Printed on every parse, with no quiet mode, so dropped entries stay visible.
 * `excluded` is what the walk actually skipped, not what the list configured.
 */
function announce(excluded: readonly QuarantinedEntry[]): void {
  if (excluded.length === 0) return;

  const count = excluded.length;
  const head =
    count === 1
      ? '1 entry excluded because it fails its own schema.'
      : `${count} entries excluded because they fail their own schema.`;
  const lines = excluded.map((entry) => `  ${entry.path}\n      ${entry.reason}`);

  console.warn(
    `\nQUARANTINE: ${head}\n` +
      `${lines.join('\n')}\n` +
      `  These are listed in src/lib/quarantine.ts. The list may only shrink: ` +
      `fix the entry, then delete its line.\n`,
  );
}

/** A quarantine line that matches no file (renumbered or deleted entry) fails the build. */
function rejectUnmatched(unmatched: readonly QuarantinedEntry[]): void {
  if (unmatched.length === 0) return;

  const lines = unmatched.map((entry) => `  ${entry.path}`);
  throw new Error(
    `${unmatched.length} quarantined ${unmatched.length === 1 ? 'path' : 'paths'} ` +
      `matched no file in entries/:\n` +
      `${lines.join('\n')}\n\n` +
      `The entry no longer exists at that path -- renumbered or deleted -- so ` +
      `delete its line from QUARANTINE in src/lib/quarantine.ts. A line that ` +
      `matches nothing makes every build report an exclusion it did not make.`,
  );
}

/** One throw for the whole walk, so a single run reports every failing file. */
function rejectFailures(failures: readonly string[]): void {
  if (failures.length === 0) return;

  const head =
    failures.length === 1
      ? '1 entry fails its schema.'
      : `${failures.length} entries fail their schemas.`;
  throw new Error(`${head}\n\n${failures.join('\n\n')}`);
}

/**
 * @param quarantine Injectable so tests can use synthetic fixtures without
 *   touching the real list. Defaults to `QUARANTINE`.
 */
export function parseEntries(
  source: LibrarySource,
  quarantine: readonly QuarantinedEntry[] = QUARANTINE,
): ParsedLibrary {
  const compiled = validators();
  const entries: ParsedEntry[] = [];
  const excluded: QuarantinedEntry[] = [];
  const failures: string[] = [];

  for (const dirName of readdirSync(source.entriesDir, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .sort()) {
    const type = DIR_TO_TYPE[dirName];
    if (type === undefined) {
      throw new Error(
        `Unmapped entry directory: entries/${dirName}\n\n` +
          `Add it to DIR_TO_TYPE in src/lib/types.ts. Failing loudly here is ` +
          `deliberate: silently skipping a directory would drop entries from ` +
          `every count in the viewer.`,
      );
    }

    for (const path of yamlFiles(join(source.entriesDir, dirName))) {
      // Always forward-slashed, so it compares against quarantine.ts as written.
      const relativePath = `${dirName}/${basename(path)}`;
      const data = parseYaml(readFileSync(path, 'utf-8')) as Record<string, unknown>;
      const failure = validationFailure(compiled.get(schemaFileFor(type)), data, path);
      const excuse = matches(quarantine, relativePath);

      if (excuse !== undefined) {
        // A quarantined file that validates must come off the list.
        if (failure === null) {
          throw new Error(
            `${relativePath} passes validation but is still quarantined.\n\n` +
              `Remove it from QUARANTINE in src/lib/quarantine.ts. The list is ` +
              `allowed to shrink and nothing else; an entry that validates ` +
              `belongs in the catalog.`,
          );
        }
        excluded.push(excuse);
        continue;
      }

      if (failure !== null) {
        failures.push(failure);
        continue;
      }

      const id = data.id;
      if (typeof id !== 'string') {
        throw new Error(`Entry at ${path} has no string id.`);
      }
      entries.push({ id, type, path, data });
    }
  }

  // Order matters: a renumbered quarantined entry is both an unmatched line and
  // an unlisted failure, and the list is what needs fixing.
  const matched = new Set(excluded.map((entry) => entry.path));
  announce(excluded);
  rejectUnmatched(quarantine.filter((entry) => !matched.has(entry.path)));
  rejectFailures(failures);

  return { entries, quarantined: excluded.map((entry) => entry.path) };
}

function stringAt(data: Record<string, unknown>, ...path: string[]): string | null {
  let cursor: unknown = data;
  for (const key of path) {
    if (typeof cursor !== 'object' || cursor === null) return null;
    cursor = (cursor as Record<string, unknown>)[key];
  }
  return typeof cursor === 'string' ? cursor : null;
}

/**
 * Narrowed by membership rather than a cast. An unrecognized status becomes
 * `null` (rendered as `status unknown`) rather than failing the build.
 */
function lifecycleStatus(value: string | null): LifecycleStatus | null {
  if (value === null) return null;
  return (LIFECYCLE_STATUSES as readonly string[]).includes(value)
    ? (value as LifecycleStatus)
    : null;
}

/**
 * The catalog row. Missing values are `null` rather than omitted (an impact
 * has no `composition_type`).
 */
export function toIndexRow(entry: ParsedEntry): IndexRow {
  return {
    id: entry.id,
    display_id: stringAt(entry.data, 'display_id') ?? entry.id,
    type: entry.type,
    label: stringAt(entry.data, 'label') ?? entry.id,
    composition_type: stringAt(entry.data, 'body', 'composition_type'),
    standing: stringAt(entry.data, 'standing', 'value'),
    status: lifecycleStatus(stringAt(entry.data, 'lifecycle', 'status')),
  };
}
