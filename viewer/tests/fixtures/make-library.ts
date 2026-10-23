import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * A throwaway library on disk, with invented content. Never copy real entries
 * into viewer/.
 */
export function makeLibrary(): { entriesDir: string; root: string } {
  const root = mkdtempSync(join(tmpdir(), 'kl-fixture-'));
  const entriesDir = join(root, 'entries');
  mkdirSync(join(entriesDir, 'pathways'), { recursive: true });
  mkdirSync(join(entriesDir, 'impacts'), { recursive: true });
  mkdirSync(join(entriesDir, 'person_context'), { recursive: true });

  writeFileSync(
    join(entriesDir, 'pathways', 'kl-900001.yaml'),
    [
      'id: kl-900001',
      'display_id: Pathway-900001',
      'label: A synthetic pathway for tests',
      'type: pathway',
      'layer: judgment',
      'definition: Invented content that exercises the parser.',
      '_internal:',
      '- who: fixture',
      '  what: invented',
      'body:',
      '  composition_type: direct',
      '  _note: internal',
      '  composition_parts:',
      '  - kind: ai_behavior',
      '    id: kl-900004',
      '    role: originator',
      '  - kind: context_value',
      '    id: kl-900005',
      '    role: condition',
      '  impacts:',
      '  - impact: kl-900002',
      '    sign: harmful',
      '    _comment: internal per-edge note',
      'standing:',
      '  value: theorized',
      '  _detail:',
      '    c1:',
      '      standing: theorized',
      'lifecycle:',
      '  status: draft',
      '  since: 2026-09-14',
      '',
    ].join('\n'),
    'utf-8',
  );

  writeFileSync(
    join(entriesDir, 'impacts', 'kl-900002.yaml'),
    [
      'id: kl-900002',
      'display_id: Impact-900002',
      'label: A synthetic impact for tests',
      'type: impact',
      'layer: judgment',
      'definition: Invented content.',
      // No `composition_type` and no `standing`, for the null-not-omitted tests.
      'body:',
      '  valence: negative',
      'lifecycle:',
      '  status: active',
      '  since: 2026-09-14',
      '',
    ].join('\n'),
    'utf-8',
  );

  writeFileSync(
    join(entriesDir, 'person_context', 'kl-900003.yaml'),
    [
      'id: kl-900003',
      'display_id: Context-900003',
      'label: A synthetic context for tests',
      'type: context',
      'layer: context',
      'definition: Invented content.',
      'body:',
      '  context_kind: condition',
      'lifecycle:',
      '  status: active',
      '  since: 2026-09-14',
      '',
    ].join('\n'),
    'utf-8',
  );

  return { entriesDir, root };
}

/**
 * Rewrites one entry's `definition` in place, producing a library that differs
 * from `makeLibrary()` only in one body.
 */
export function editEntryDefinition(
  entriesDir: string,
  relativePath: string,
  definition: string,
): void {
  const path = join(entriesDir, ...relativePath.split('/'));
  const yaml = readFileSync(path, 'utf-8');
  const edited = yaml.replace(/^definition: .*$/m, `definition: ${definition}`);
  if (edited === yaml) {
    throw new Error(`No \`definition:\` line to edit in ${relativePath}`);
  }
  writeFileSync(path, edited, 'utf-8');
}

/** Writes an entry that violates its schema: `id` is missing. */
export function writeInvalidEntry(entriesDir: string): string {
  return writeInvalidEntryAt(entriesDir, 'pathways/kl-900099.yaml');
}

/**
 * The same schema violation at a caller-chosen path. `relativePath` is
 * forward-slashed and relative to entriesDir, matching `quarantine.ts`.
 */
export function writeInvalidEntryAt(entriesDir: string, relativePath: string): string {
  const [dirName, fileName] = relativePath.split('/');
  if (dirName === undefined || fileName === undefined) {
    throw new Error(`Expected "<dir>/<file>.yaml", got ${relativePath}`);
  }

  mkdirSync(join(entriesDir, dirName), { recursive: true });
  const path = join(entriesDir, dirName, fileName);
  writeFileSync(
    path,
    ['display_id: Pathway-900099', 'label: Missing its id', 'type: pathway', ''].join('\n'),
    'utf-8',
  );
  return path;
}
