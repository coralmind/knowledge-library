/**
 * Entries the viewer knowingly refuses to render, and why.
 *
 * `parse.ts` fails the build on any schema violation. An entry whose
 * violation is not the viewer's to resolve (an open modeling question, or a
 * decision for the maintainers) may be listed here, with a reason, so the rest
 * of the catalog still renders. Every parse prints the whole list.
 *
 * THIS LIST MAY ONLY SHRINK. `parse.ts` fails the build when a listed file
 * starts passing validation or matches no file at all. The fix itself belongs
 * in `entries/` or `src/coralmap/`.
 */

export interface QuarantinedEntry {
  /** Path relative to entriesDir, e.g. `pathways/kl-000077.yaml`. */
  path: string;
  reason: string;
}

export const QUARANTINE: readonly QuarantinedEntry[] = [];

/**
 * The matching rule shared by `parseEntries` and `isQuarantined`. Matches the
 * full path relative to entriesDir, never the basename, since two directories
 * can hold the same file name.
 */
export function matches(
  list: readonly QuarantinedEntry[],
  relativePath: string,
): QuarantinedEntry | undefined {
  return list.find((entry) => entry.path === relativePath);
}

export function isQuarantined(relativePath: string): boolean {
  return matches(QUARANTINE, relativePath) !== undefined;
}
