/**
 * Where the library YAML and schemas are: `../entries` and `../schema` in the
 * repo checkout, so the build needs no Python. This is the only module that
 * resolves these paths.
 *
 * `KL_ENTRIES_DIR` and `KL_SCHEMA_DIR` override them, as `CORALMIND_KL_PATH`
 * does on the Python side.
 */
import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface LibrarySource {
  entriesDir: string;
}

/**
 * Anchored to the working directory rather than `import.meta.url`, because
 * bundlers move this module into build output. npm runs scripts from `viewer/`.
 */
function repoRoot(): string {
  return resolve(process.cwd(), '..');
}

function requireDir(path: string, envVar: string): string {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(
      `Library source directory not found: ${path}\n\n` +
        `The viewer builds from the repository checkout. If this directory ` +
        `lives elsewhere, set ${envVar} to point at it.`,
    );
  }
  return resolve(path);
}

export function resolveSource(): LibrarySource {
  const entriesDir = process.env.KL_ENTRIES_DIR ?? join(repoRoot(), 'entries');

  return {
    entriesDir: requireDir(entriesDir, 'KL_ENTRIES_DIR'),
  };
}

/** Where the JSON Schemas are. Used by Ajv to validate entry bodies. */
export function resolveSchemaDir(): string {
  const dir = process.env.KL_SCHEMA_DIR ?? join(repoRoot(), 'schema');
  return requireDir(dir, 'KL_SCHEMA_DIR');
}
