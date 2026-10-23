/**
 * Content that per-request pages read must render without the entry artifacts,
 * which do not ship to those routes (see `outputFileTracingIncludes`).
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('per-request content', () => {
  it('reads the guide step headings with no generated artifacts', async () => {
    vi.stubEnv('KL_GENERATED_DIR', join(tmpdir(), 'kl-not-generated'));
    const { guideStep, guideStepHeading } = await import('../src/lib/content/load');
    for (const step of [1, 2, 3, 4, 5]) expect(guideStepHeading(step).length).toBeGreaterThan(0);
    expect(() => guideStep(1)).toThrow(/npm run ingest/);
  });
});
