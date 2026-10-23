/**
 * A scanner that always exits 0 looks exactly like a clean build, so it gets
 * its own tests. Each case runs the real script against a fabricated
 * `.next`-shaped tree, because `npm run build` depends on its exit code.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { ingest } from '../scripts/ingest';
import type { QuarantinedEntry } from '../src/lib/quarantine';
import { makeLibrary } from './fixtures/make-library';

const SCRIPT = fileURLToPath(new URL('../scripts/assert-no-internal-fields.ts', import.meta.url));

const NO_QUARANTINE: readonly QuarantinedEntry[] = [];

/**
 * The scanner derives its search names from the private artifacts, so it gets
 * the fixture library's generated tree through `KL_GENERATED_DIR`. The
 * fixture's internal keys are `_comment`, `_detail`, `_internal` and `_note`.
 */
let generated: string;

beforeAll(() => {
  generated = mkdtempSync(join(tmpdir(), 'kl-scan-artifacts-'));
  ingest({ outDir: generated, source: makeLibrary(), quarantine: NO_QUARANTINE });
});

/**
 * `stdio` is piped so stderr can be asserted and the deliberate LEAK lines do
 * not print as suite output.
 *
 * `node --import tsx/esm` rather than the `tsx` CLI, which opens a unix socket
 * that sandboxed environments refuse with EPERM.
 */
function scan(dir: string, generatedDir = generated): { code: number; output: string } {
  try {
    const output = execFileSync(process.execPath, ['--import', 'tsx/esm', SCRIPT, '--dir', dir], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, KL_GENERATED_DIR: generatedDir },
    });
    return { code: 0, output };
  } catch (error) {
    const err = error as { status: number | null; stdout: string; stderr: string };
    return { code: err.status ?? -1, output: `${err.stdout}${err.stderr}` };
  }
}

function buildOutput(contents: string): string {
  const root = mkdtempSync(join(tmpdir(), 'kl-scan-'));
  mkdirSync(join(root, 'server', 'app', 'entry'), { recursive: true });
  writeFileSync(join(root, 'server', 'app', 'entry', 'kl-1.html'), contents, 'utf-8');
  return root;
}

/**
 * A crashed script also exits non-zero, so every case asserts the output line
 * (LEAK plus the name, or OK) as well as the exit code.
 */
describe('assert-no-internal-fields', () => {
  it('passes on clean output', () => {
    const result = scan(buildOutput('<h1>Fabricated referral</h1><p>display_id</p>'));
    expect(result.code).toBe(0);
    expect(result.output).toContain('OK:');
  });

  it('fails when an internal key appears in served HTML', () => {
    const result = scan(buildOutput('<script>{"_note":"internal reasoning"}</script>'));
    expect(result.code).toBe(1);
    expect(result.output).toContain('LEAK');
    expect(result.output).toContain('_note');
  });

  it('fails on a nested internal key', () => {
    const result = scan(buildOutput('<script>{"a":{"_internal":[1]}}</script>'));
    expect(result.code).toBe(1);
    expect(result.output).toContain('LEAK');
    expect(result.output).toContain('_internal');
  });

  /**
   * The entry page's `Details` passes field names as React keys, which the flight payload
   * serializes in value position, with no trailing colon.
   */
  it('fails on an internal key in React-key position, with no trailing colon', () => {
    const result = scan(buildOutput('<div>["$","section",\\"_note\\",{}]</div>'));
    expect(result.code).toBe(1);
    expect(result.output).toContain('LEAK');
    expect(result.output).toContain('_note');
  });

  /** Names match as complete quoted tokens, not substrings. */
  it('does not flag a public key that contains an internal name as a substring', () => {
    const result = scan(buildOutput('<div>{\\"editor_note\\":\\"theorized\\"}</div>'));
    expect(result.code).toBe(0);
    expect(result.output).toContain('OK:');
  });

  it('does not flag a non-leading underscore', () => {
    const result = scan(buildOutput('<script>{"display_id":"Pathway-1"}</script>'));
    expect(result.code).toBe(0);
    expect(result.output).toContain('OK:');
  });

  it('refuses to report a clean scan of nothing', () => {
    const result = scan(mkdtempSync(join(tmpdir(), 'kl-scan-empty-')));
    expect(result.code).toBe(2);
    expect(result.output).toContain('no served files');
  });

  it('refuses to scan when the tiers differ but no internal names could be derived', () => {
    const empty = mkdtempSync(join(tmpdir(), 'kl-scan-no-names-'));
    mkdirSync(join(empty, 'entry'), { recursive: true });
    const entry = { id: 'kl-900001', label: 'Nothing internal here' };
    writeFileSync(join(empty, 'entry', 'kl-900001.public.json'), JSON.stringify(entry), 'utf-8');
    writeFileSync(
      join(empty, 'entry', 'kl-900001.private.json'),
      JSON.stringify({ ...entry, removed: 'by something other than the underscore rule' }),
      'utf-8',
    );

    const result = scan(buildOutput('<script>{"_note":"internal"}</script>'), empty);
    expect(result.code).toBe(2);
    expect(result.output).toContain('derived no internal key names');
  });

  /** A library with no internal fields has identical tiers: a pass, not a vacuous scan. */
  it('passes when the private tier is identical to the public one', () => {
    const clean = mkdtempSync(join(tmpdir(), 'kl-scan-clean-'));
    mkdirSync(join(clean, 'entry'), { recursive: true });
    const entry = JSON.stringify({ id: 'kl-900001', label: 'Nothing internal here' });
    writeFileSync(join(clean, 'entry', 'kl-900001.public.json'), entry, 'utf-8');
    writeFileSync(join(clean, 'entry', 'kl-900001.private.json'), entry, 'utf-8');

    const result = scan(buildOutput('<script>{"_note":"internal"}</script>'), clean);
    expect(result.code).toBe(0);
    expect(result.output).toContain('carry no internal fields');
  });
});
