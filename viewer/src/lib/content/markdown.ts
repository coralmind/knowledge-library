/**
 * A small Markdown reader for the files in `content/`, producing a tree that
 * `components/content/Markdown.tsx` renders.
 *
 * It reads what those files use and nothing more: front matter, headings,
 * paragraphs, flat lists, tables, images, block quotes, HTML comments (dropped,
 * which is where draft notes live) and `:::name args` ... `:::` containers,
 * which may nest. Inline: `code`, **strong**, *emphasis*, [links](href),
 * {{tokens}} and [[kl-000000]] entry references, optionally [[kl-000000|text]].
 */
import { parse as parseYaml } from 'yaml';
import { slug } from '../glossary';

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong'; children: Inline[] }
  | { kind: 'em'; children: Inline[] }
  | { kind: 'link'; href: string; children: Inline[] }
  | { kind: 'token'; expr: string }
  | { kind: 'ref'; id: string; text?: string };

export type Block =
  | { kind: 'heading'; level: number; id: string; step?: number; children: Inline[] }
  | { kind: 'paragraph'; children: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }
  | { kind: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { kind: 'image'; alt: string; src: string }
  | { kind: 'quote'; children: Inline[] }
  | { kind: 'container'; name: string; args: string[]; children: Block[] };

export interface Document {
  meta: Record<string, unknown>;
  blocks: Block[];
}

const INLINE = /`([^`]+)`|\{\{([^}]+)\}\}|\[\[(kl-\d{6})(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) });
    if (m[1] !== undefined) out.push({ kind: 'code', text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: 'token', expr: m[2].trim() });
    else if (m[3] !== undefined) out.push({ kind: 'ref', id: m[3], ...(m[4] ? { text: m[4] } : {}) });
    else if (m[5] !== undefined && m[6] !== undefined) out.push({ kind: 'link', href: m[6], children: parseInline(m[5]) });
    else if (m[7] !== undefined) out.push({ kind: 'strong', children: parseInline(m[7]) });
    else if (m[8] !== undefined) out.push({ kind: 'em', children: parseInline(m[8]) });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/** Plain text of inline content, with tokens and references left as written. */
export function inlineText(nodes: Inline[]): string {
  return nodes
    .map((n) => {
      if (n.kind === 'text' || n.kind === 'code') return n.text;
      if (n.kind === 'token') return `{{${n.expr}}}`;
      if (n.kind === 'ref') return n.text ?? n.id;
      return inlineText(n.children);
    })
    .join('');
}

/** Splits a table row on `|`, except inside a {{token}} or [[reference|text]], which may contain one. */
function cells(row: string): string[] {
  const inner = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < inner.length; i += 1) {
    const two = inner.slice(i, i + 2);
    if (two === '{{' || two === '[[') depth += 1;
    if (two === '}}' || two === ']]') depth = Math.max(0, depth - 1);
    if (inner[i] === '|' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += inner[i];
  }
  out.push(cur.trim());
  return out;
}

export function parseDocument(source: string): Document {
  let text = source.replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
  let meta: Record<string, unknown> = {};
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (front) {
    meta = (parseYaml(front[1] ?? '') as Record<string, unknown>) ?? {};
    text = text.slice(front[0].length);
  }

  const root: Block[] = [];
  const stack: Block[][] = [root];
  const usedIds = new Set<string>();
  const here = () => stack[stack.length - 1] as Block[];
  let para: string[] = [];
  let table: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];

  const flush = () => {
    if (para.length) here().push({ kind: 'paragraph', children: parseInline(para.join(' ')) });
    if (table.length >= 2) {
      const [head = '', , ...rows] = table;
      here().push({ kind: 'table', head: cells(head).map(parseInline), rows: rows.map((r) => cells(r).map(parseInline)) });
    }
    if (list) here().push({ kind: 'list', ordered: list.ordered, items: list.items.map(parseInline) });
    if (quote.length) here().push({ kind: 'quote', children: parseInline(quote.join(' ')) });
    para = [];
    table = [];
    list = null;
    quote = [];
  };

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const open = /^:::\s*([a-z][a-z-]*)\s*(.*)$/.exec(line);
    if (open) {
      flush();
      const block: Block = { kind: 'container', name: open[1] ?? '', args: (open[2] ?? '').split(/\s+/).filter(Boolean), children: [] };
      here().push(block);
      stack.push(block.children);
      continue;
    }
    if (/^:::\s*$/.test(line)) {
      flush();
      if (stack.length === 1) throw new Error('A ":::" closes a container that was never opened.');
      stack.pop();
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^(#{1,4})\s+(.+?)(?:\s+\{#([a-z0-9-]+)\})?$/.exec(line);
    if (heading) {
      flush();
      const level = (heading[1] ?? '#').length;
      let title = heading[2] ?? '';
      const step = /^Step (\d+)\.\s+(.+)$/.exec(title);
      if (step) title = step[2] ?? title;
      let id = heading[3] ?? (step ? `step-${step[1]}` : slug(inlineText(parseInline(title))));
      for (let n = 2; usedIds.has(id); n += 1) id = `${heading[3] ?? slug(title)}-${n}`;
      usedIds.add(id);
      here().push({ kind: 'heading', level, id, ...(step ? { step: Number(step[1]) } : {}), children: parseInline(title) });
      continue;
    }
    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim());
    if (image) {
      flush();
      here().push({ kind: 'image', alt: image[1] ?? '', src: image[2] ?? '' });
      continue;
    }
    if (line.startsWith('|')) {
      if (!table.length) flush();
      table.push(line);
      continue;
    }
    if (line.startsWith('>')) {
      if (!quote.length) flush();
      quote.push(line.replace(/^>\s?/, ''));
      continue;
    }
    const item = /^(-|\d+\.)\s+(.*)$/.exec(line);
    if (item) {
      const ordered = item[1] !== '-';
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push(item[2] ?? '');
      continue;
    }
    if (list && /^\s{2,}\S/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    if (table.length || list || quote.length) flush();
    para.push(line.trim());
  }
  flush();
  if (stack.length > 1) throw new Error('A ":::" container is never closed.');
  return { meta, blocks: root };
}

/** Every inline node in a tree, for checks that each token and reference resolves. */
export function* walkInline(blocks: Block[]): Generator<Inline> {
  const visit = function* (nodes: Inline[]): Generator<Inline> {
    for (const n of nodes) {
      yield n;
      if (n.kind === 'strong' || n.kind === 'em' || n.kind === 'link') yield* visit(n.children);
    }
  };
  for (const b of blocks) {
    if (b.kind === 'heading' || b.kind === 'paragraph' || b.kind === 'quote') yield* visit(b.children);
    else if (b.kind === 'list') for (const i of b.items) yield* visit(i);
    else if (b.kind === 'table') for (const row of [b.head, ...b.rows]) for (const c of row) yield* visit(c);
    else if (b.kind === 'container') {
      for (const a of b.args) if (/^kl-\d{6}$/.test(a)) yield { kind: 'ref', id: a };
      yield* walkInline(b.children);
    }
  }
}
