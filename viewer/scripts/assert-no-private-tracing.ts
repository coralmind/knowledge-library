/**
 * Fails the build if any server bundle traces a `*.private.json` artifact.
 *
 * `assert-no-internal-fields.ts` checks what is served; this checks what is
 * shipped, so no route, rewrite, or debug endpoint can read an unredacted file
 * in a deployment. The guarantee rests on the tracing rules in
 * `next.config.ts`, which break quietly: an include keyed on '/' matches every
 * route, and removing the exclude lets the tracer sweep in all of
 * `src/generated/`.
 *
 * Reads the `.nft.json` trace manifests, which are what deployments package
 * from and which name the offending route.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const dirFlag = process.argv.indexOf('--dir');
const dirValue = dirFlag === -1 ? undefined : process.argv[dirFlag + 1];

/** A bare `--dir` is an error rather than a silent fallback to `.next`. */
if (dirFlag !== -1 && dirValue === undefined) {
  console.error('assert-no-private-tracing: --dir requires a directory path.');
  process.exit(2);
}

const root = dirValue ?? join(process.cwd(), '.next');

/**
 * One `.nft.json` per server entry point, beside its bundle.
 * `readdirSync(recursive)` because `fs.promises.glob` warns as experimental in Node 22.
 */
function traceManifests(): string[] {
  const dir = join(root, 'server');
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { recursive: true, encoding: 'utf-8' })
    .filter((name) => name.endsWith('.nft.json'))
    .map((name) => join('server', name));
}

const manifests = traceManifests();

/**
 * Zero manifests is a failure, not a clean trace: the build has not run, or a
 * Next upgrade changed where manifests are written.
 */
if (manifests.length === 0) {
  console.error(
    `assert-no-private-tracing: found no trace manifests under ${root}.\n\n` +
      `Expected *.nft.json beneath server/, one per server entry point. Either\n` +
      `the build has not run, or Next has changed where it writes file-tracing\n` +
      `manifests and \`traceManifests()\` in this script needs updating -- it is\n` +
      `not evidence that the private tier stayed out.`,
  );
  process.exit(2);
}

/** Paths are relative to the manifest, so match on the suffix ingest writes. */
const PRIVATE_ARTIFACT = /\.private\.json$/;

/** How many offending paths to print per manifest before summarizing the rest. */
const NAMED = 5;

let failures = 0;

for (const manifest of manifests) {
  const parsed = JSON.parse(readFileSync(join(root, manifest), 'utf-8')) as { files?: unknown };

  /** A manifest without a `files` array is a format change: inconclusive, not a pass. */
  if (!Array.isArray(parsed.files)) {
    console.error(
      `assert-no-private-tracing: ${manifest} has no \`files\` array.\n\n` +
        `The manifest format changed. This script reads \`files\` to decide what\n` +
        `a route ships; a manifest it cannot read is not a manifest it cleared.`,
    );
    process.exit(2);
  }

  const traced = parsed.files
    .filter((file): file is string => typeof file === 'string')
    .filter((file) => PRIVATE_ARTIFACT.test(file))
    .sort();

  if (traced.length > 0) {
    failures += 1;
    const named = traced.slice(0, NAMED).join(', ');
    const rest = traced.length > NAMED ? ` (+${traced.length - NAMED} more)` : '';
    console.error(`LEAK ${manifest}: traces ${traced.length} private artifact(s): ${named}${rest}`);
  }
}

if (failures > 0) {
  console.error(
    `\n${failures} trace manifest(s) ship unredacted entry data.\n` +
      `Every route is covered by the \`'/'\` key of outputFileTracingExcludes in\n` +
      `next.config.ts, so no route may trace \`src/generated/**/*.private.json\`;\n` +
      `an include beats an exclude, so a manifest listing one means an include\n` +
      `put it back.\n\n` +
      `Read the include keys as SUBSTRINGS, not routes: Next matches them with\n` +
      `picomatch in \`contains\` mode, so '/' matches every route and an entry\n` +
      `under it ships everywhere. A route that legitimately needs the private\n` +
      `tier must key its include on a path fragment unique to that route, and\n` +
      `this assertion has to be taught about it deliberately rather than relaxed.`,
  );
  process.exit(1);
}

console.log(`OK: no private artifacts traced into ${manifests.length} server bundles.`);
