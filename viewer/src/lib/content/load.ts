/**
 * Reads page content from `content/` and checks it against the catalog: every
 * `{{token}}` must resolve and every `[[kl-...]]` must name an entry, or the
 * page fails to build.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog } from '../catalog';
import { contentDir } from '../glossary';
import { parseDocument, walkInline, type Block, type Document, type Inline } from './markdown';
import { resolveToken } from './tokens';

const cache = new Map<string, Document>();

export function loadDocument(path: string): Document {
  const hit = cache.get(path);
  if (hit && process.env.NODE_ENV === 'production') return hit;
  const doc = parseDocument(readFileSync(join(contentDir(), path), 'utf-8'));
  const catalog = loadCatalog();
  const errors: string[] = [];
  for (const node of walkInline(doc.blocks)) {
    if (node.kind === 'token') {
      try {
        resolveToken(node.expr, catalog);
      } catch (err) {
        errors.push((err as Error).message);
      }
    } else if (node.kind === 'ref' && !catalog.byId.has(node.id)) {
      errors.push(`[[${node.id}]] names no entry`);
    }
  }
  if (errors.length) throw new Error(`content/${path}:\n  ${errors.join('\n  ')}`);
  cache.set(path, doc);
  return doc;
}

/** An SVG figure from `content/`, inlined so it inherits the page's fonts and colors. */
export function loadFigure(path: string): string {
  return readFileSync(join(contentDir(), path), 'utf-8');
}

function stepAt(blocks: Block[], n: number): number {
  const at = blocks.findIndex((b) => b.kind === 'heading' && b.level === 2 && b.step === n);
  if (at < 0) throw new Error(`The guide has no "## Step ${n}." heading.`);
  return at;
}

/** The guide's heading and opening paragraphs for one of its five steps, which the home page reuses. */
export function guideStep(n: number, paragraphs = 1): { heading: Inline[]; blocks: Block[] } {
  const { blocks } = loadDocument('guide/how-the-library-works.md');
  const at = stepAt(blocks, n);
  const heading = blocks[at];
  if (heading?.kind !== 'heading') throw new Error(`The guide has no "## Step ${n}." heading.`);
  const opening: Block[] = [];
  for (const b of blocks.slice(at + 1)) {
    if (b.kind !== 'paragraph' || opening.length >= paragraphs) break;
    opening.push(b);
  }
  return { heading: heading.children, blocks: opening };
}

const guideHeadings = new Map<number, Inline[]>();

/**
 * The heading of one of the guide's five steps, for pages rendered per request.
 * It skips the catalog check `loadDocument` runs, because that reads every entry
 * artifact and those do not ship to per-request routes. A token or entry
 * reference added to a step heading would need the same artifacts to render.
 */
export function guideStepHeading(n: number): Inline[] {
  const hit = guideHeadings.get(n);
  if (hit) return hit;
  const { blocks } = parseDocument(readFileSync(join(contentDir(), 'guide/how-the-library-works.md'), 'utf-8'));
  const heading = blocks[stepAt(blocks, n)];
  if (heading?.kind !== 'heading') throw new Error(`The guide has no "## Step ${n}." heading.`);
  guideHeadings.set(n, heading.children);
  return heading.children;
}

export interface OutlineItem {
  id: string;
  title: Inline[];
  step?: number;
  sub: boolean;
}

/** The page outline: every second-level heading, and numbered third-level ones beneath it. */
export function outline(blocks: Block[]): OutlineItem[] {
  return blocks.flatMap((b): OutlineItem[] =>
    b.kind === 'heading' && (b.level === 2 || (b.level === 3 && b.step !== undefined))
      ? [{ id: b.id, title: b.children, sub: b.level === 3, ...(b.step !== undefined ? { step: b.step } : {}) }]
      : [],
  );
}

/** The blocks under one of the guide's headings, up to the next heading at the same level or above. */
export function guideSection(id: string): Block[] {
  const { blocks } = loadDocument('guide/how-the-library-works.md');
  const at = blocks.findIndex((b) => b.kind === 'heading' && b.id === id);
  const heading = blocks[at];
  if (at < 0 || heading?.kind !== 'heading') throw new Error(`The guide has no heading with id "${id}".`);
  const end = blocks.findIndex((b, i) => i > at && b.kind === 'heading' && b.level <= heading.level);
  return blocks.slice(at + 1, end < 0 ? undefined : end);
}
