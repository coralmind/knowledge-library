/**
 * Tests for `scripts/assert-no-private-tracing.ts`, run as a real process
 * against a fabricated `.next`-shaped tree because `npm run build` depends on
 * its exit code.
 *
 * As in `leak-scanner.test.ts`: `node --import tsx/esm` rather than the `tsx`
 * CLI, which needs a unix socket that sandboxed environments refuse; and every
 * failing case asserts the message as well as the code, because a crashed
 * script also exits non-zero.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(new URL('../scripts/assert-no-private-tracing.ts', import.meta.url));

/** `stdio` piped so the deliberate LEAK lines do not print as suite output. */
function assertTracing(args: string[]): { code: number; output: string } {
  try {
    const output = execFileSync(process.execPath, ['--import', 'tsx/esm', SCRIPT, ...args], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, output };
  } catch (error) {
    const err = error as { status: number | null; stdout: string; stderr: string };
    return { code: err.status ?? -1, output: `${err.stdout}${err.stderr}` };
  }
}

function scan(dir: string): { code: number; output: string } {
  return assertTracing(['--dir', dir]);
}

/**
 * A `.next`-shaped tree holding one trace manifest at `server/app/<name>`,
 * with paths relative to the manifest as Next writes them.
 */
function buildOutput(manifest: unknown, name = 'page.js.nft.json'): string {
  const root = mkdtempSync(join(tmpdir(), 'kl-trace-'));
  mkdirSync(join(root, 'server', 'app'), { recursive: true });
  writeFileSync(join(root, 'server', 'app', name), JSON.stringify(manifest), 'utf-8');
  return root;
}

const PUBLIC_TRACE = {
  version: 1,
  files: [
    '../../../src/generated/index.public.json',
    '../../../src/generated/meta.json',
    '../../chunks/ssr/node_modules_next_dist_1.js',
  ],
};

describe('assert-no-private-tracing', () => {
  it('passes when a route traces only public artifacts', () => {
    const result = scan(buildOutput(PUBLIC_TRACE));
    expect(result.code).toBe(0);
    expect(result.output).toContain('OK:');
  });

  /** E.g. a private artifact added to an include keyed on '/', which matches every route. */
  it('fails when a route traces a private artifact, and names the manifest', () => {
    const result = scan(
      buildOutput({
        version: 1,
        files: [
          '../../../src/generated/index.public.json',
          '../../../src/generated/entry/kl-000039.private.json',
        ],
      }),
    );

    expect(result.code).toBe(1);
    expect(result.output).toContain('LEAK');
    expect(result.output).toContain('server/app/page.js.nft.json');
    expect(result.output).toContain('kl-000039.private.json');
  });

  it('counts every private artifact a manifest traces', () => {
    const files = Array.from(
      { length: 7 },
      (_, index) => `../../../src/generated/entry/kl-90000${index}.private.json`,
    );
    const result = scan(buildOutput({ version: 1, files }));

    expect(result.code).toBe(1);
    expect(result.output).toContain('traces 7 private artifact(s)');
    // Only the first few are named; the rest are summarized.
    expect(result.output).toContain('+2 more');
  });

  it('does not flag the public artifact of the same entry', () => {
    const result = scan(
      buildOutput({ version: 1, files: ['../../../src/generated/entry/kl-000039.public.json'] }),
    );
    expect(result.code).toBe(0);
  });

  it('refuses to report a clean trace of nothing', () => {
    const result = scan(mkdtempSync(join(tmpdir(), 'kl-trace-empty-')));
    expect(result.code).toBe(2);
    expect(result.output).toContain('no trace manifests');
  });

  it('refuses to clear a manifest it cannot read', () => {
    const result = scan(buildOutput({ version: 1, traced: ['something-else'] }));
    expect(result.code).toBe(2);
    expect(result.output).toContain('no `files` array');
  });

  it('rejects --dir with no directory after it', () => {
    const result = assertTracing(['--dir']);
    expect(result.code).toBe(2);
    expect(result.output).toContain('requires a directory path');
  });
});
