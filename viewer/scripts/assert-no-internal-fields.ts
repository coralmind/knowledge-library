/**
 * Post-build scan of served output for internal key names.
 *
 * The redaction tests prove the public artifacts are clean; this catches a
 * component that reads the private artifact anyway, including leaks inside
 * RSC payloads embedded in HTML.
 *
 * Scans only served files: prerendered HTML, RSC payloads, and client chunks.
 * Whether a private artifact is bundled at all is checked separately by
 * `assert-no-private-tracing.ts`, which can name the offending route.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { entryIds, loadPrivateEntry, loadPublicEntry } from '../src/lib/artifacts';
import { findInternalKeys, isInternalKey } from '../src/lib/redact';

const dirFlag = process.argv.indexOf('--dir');
const dirValue = dirFlag === -1 ? undefined : process.argv[dirFlag + 1];

/** A bare `--dir` is an error rather than a silent fallback to `.next`. */
if (dirFlag !== -1 && dirValue === undefined) {
  console.error('assert-no-internal-fields: --dir requires a directory path.');
  process.exit(2);
}

const root = dirValue ?? join(process.cwd(), '.next');

/** `readdirSync(recursive)` because `fs.promises.glob` warns as experimental in Node 22. */
function servedFiles(): string[] {
  const roots = ['server/app', 'static'];
  const extensions = ['.html', '.rsc', '.js'];
  const found: string[] = [];

  for (const relative of roots) {
    const dir = join(root, relative);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir, { recursive: true, encoding: 'utf-8' })) {
      if (extensions.some((extension) => name.endsWith(extension))) {
        found.push(join(relative, name));
      }
    }
  }
  return found;
}

/** The key name at the end of a `findInternalKeys` path: `_note` from `a.b._note` or `a.b[0]._note`. */
function leafOf(path: string): string | undefined {
  const segment = path.split('.').pop();
  if (segment === undefined) return undefined;
  const bracket = segment.lastIndexOf(']');
  const leaf = bracket === -1 ? segment : segment.slice(bracket + 1);
  return leaf === '' ? undefined : leaf;
}

/**
 * Every internal key name present in this build's private artifacts. Derived
 * rather than enumerated, because new `_`-prefixed keys can be added to
 * entries at any time; every name found here must be absent from served output.
 */
function internalKeyNames(): string[] {
  const names = new Set<string>();

  const collect = (value: unknown): void => {
    for (const path of findInternalKeys(value)) {
      const leaf = leafOf(path);
      if (leaf !== undefined && isInternalKey(leaf)) names.add(leaf);
    }
  };

  for (const id of entryIds()) collect(loadPrivateEntry(id));

  return [...names].sort();
}

const names = internalKeyNames();

/** True when every private artifact equals its public one, i.e. there are no internal fields. */
function tiersAreIdentical(): boolean {
  return entryIds().every(
    (id) => JSON.stringify(loadPrivateEntry(id)) === JSON.stringify(loadPublicEntry(id)),
  );
}

/**
 * An empty name set would make the alternation below match every quote. With
 * identical tiers there is nothing to leak; with differing tiers, the
 * derivation missed something.
 */
if (names.length === 0 && tiersAreIdentical()) {
  console.log('OK: the private artifacts carry no internal fields, so no served file can leak one.');
  process.exit(0);
}

if (names.length === 0) {
  console.error(
    `assert-no-internal-fields: derived no internal key names from the private artifacts.\n\n` +
      `The scan searches for the names the library actually uses, so an empty\n` +
      `set makes it vacuous. Either \`npm run ingest\` wrote private artifacts\n` +
      `with no \`_\`-prefixed fields, or \`internalKeyNames()\` in this script has\n` +
      `stopped extracting them -- it is not evidence of a clean build.`,
  );
  process.exit(2);
}

/**
 * Any internal name as a complete quoted token, bare in JSON or
 * backslash-escaped inside an RSC payload embedded in HTML.
 *
 * No trailing colon: `EntryBody` uses field names as React keys, which the
 * flight payload serializes in value position (`["$","section",\"_note\",{}]`).
 * Quotes on both sides: a public key such as `editor_note` contains `_note`,
 * and the closing quote also keeps one name from matching as a prefix of
 * another. One alternation rather than a regex per name, for speed.
 */
const escape = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const INTERNAL_TOKEN = new RegExp(`["\\\\]{1,2}(${names.map(escape).join('|')})["\\\\]{1,2}`, 'g');

const paths = servedFiles();

/**
 * Zero files is a failure, not a clean scan: the build has not run, or a Next
 * upgrade moved `server/app` or `static`.
 */
if (paths.length === 0) {
  console.error(
    `assert-no-internal-fields: found no served files under ${root}.\n\n` +
      `Expected prerendered HTML, RSC payloads or client chunks beneath\n` +
      `server/app/ and static/. Either the build has not run, or Next has\n` +
      `changed where it writes served output and \`servedFiles()\` in this\n` +
      `script needs updating -- it is not evidence of a clean build.`,
  );
  process.exit(2);
}

let failures = 0;

for (const path of paths) {
  const text = readFileSync(join(root, path), 'utf-8');
  const hits = new Set<string>();
  for (const match of text.matchAll(INTERNAL_TOKEN)) {
    const name = match[1];
    if (name !== undefined) hits.add(name);
  }
  if (hits.size > 0) {
    failures += 1;
    console.error(`LEAK ${path}: ${[...hits].sort().join(', ')}`);
  }
}

if (failures > 0) {
  console.error(
    `\n${failures} served file(s) carry internal key names from the private artifacts.\n` +
      `Public pages must read only *.public.json artifacts, so treat this as a\n` +
      `leak: find the page or component that reached into a private artifact.\n\n` +
      `There is no exemption list to add a name to, and none is needed -- every\n` +
      `name searched for is one this library's own private artifacts use, so a\n` +
      `hit cannot be a framework key or a coincidence of shape.`,
  );
  process.exit(1);
}

console.log(`OK: no internal fields in ${paths.length} served files (${names.length} names).`);
