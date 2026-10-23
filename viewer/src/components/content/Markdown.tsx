/**
 * Renders a parsed content file. Every class name a content file can produce
 * is set here or in a widget; the styles live in `src/styles/content.css`.
 */
import type { ReactNode } from 'react';
import { loadCatalog } from '../../lib/catalog';
import { inlineText, type Block, type Inline } from '../../lib/content/markdown';
import { loadFigure } from '../../lib/content/load';
import { resolveToken } from '../../lib/content/tokens';
import { loadGlossary } from '../../lib/glossary';
import { titleCase } from '../../lib/titlecase';
import { EntryRef } from '../EntryRef';
import { WIDGETS } from './widgets';

/** Glossary lookup for a stored value written in code style, such as `theorized`. */
function storedValueTitle(text: string): string | undefined {
  for (const list of loadGlossary().lists) {
    if (!list.vocabulary) continue;
    const v = list.values.find((x) => x.value === text);
    if (v) return `${list.name}: ${v.name}. ${v.meaning}`;
  }
  return undefined;
}

const external = (href: string) => /^https?:/.test(href);

export function Inlines({ nodes, title = false }: { nodes: Inline[]; title?: boolean }): ReactNode {
  return nodes.map((n, i) => {
    switch (n.kind) {
      case 'text':
        return title ? titleCase(n.text) : n.text;
      case 'code':
        return (
          <code key={i} title={storedValueTitle(n.text)}>
            {n.text}
          </code>
        );
      case 'strong':
        return <strong key={i}><Inlines nodes={n.children} title={title} /></strong>;
      case 'em':
        return <em key={i}><Inlines nodes={n.children} title={title} /></em>;
      case 'link':
        return (
          <a key={i} href={n.href} {...(external(n.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            <Inlines nodes={n.children} title={title} />
          </a>
        );
      case 'token': {
        const { text, description } = resolveToken(n.expr, loadCatalog());
        return (
          <span key={i} className="counted" tabIndex={0} data-tip={`Counted from the catalog. ${description}`}>
            {text}
          </span>
        );
      }
      case 'ref':
        return <EntryRef key={i} id={n.id} text={n.text} />;
    }
  });
}

function Heading({ block }: { block: Extract<Block, { kind: 'heading' }> }) {
  const content = <Inlines nodes={block.children} title={block.level <= 3} />;
  if (block.level === 2) {
    return (
      <>
        {block.step !== undefined && <p className="eyebrow step-eyebrow">Step {block.step}</p>}
        <h2 id={block.id}>{content}</h2>
      </>
    );
  }
  if (block.level === 3) {
    return (
      <h3 id={block.id}>
        {block.step !== undefined && <span className="step-badge" aria-hidden="true">{block.step}</span>}
        {content}
      </h3>
    );
  }
  return block.level === 1 ? <h1 id={block.id}>{content}</h1> : <h4 id={block.id}>{content}</h4>;
}

export function Table({ head, rows }: { head: Inline[][]; rows: Inline[][][] }) {
  return (
    <div className="content-table">
      <table>
        <thead>
          <tr>{head.map((c, i) => <th key={i} scope="col"><Inlines nodes={c} /></th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>{row.map((c, i) => <td key={i}><Inlines nodes={c} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The short lead-in an item opens with, such as "Conditions." or "Actors:", if it has one. */
function leadIn(nodes: Inline[]): RegExpExecArray | null {
  const first = nodes[0];
  return first?.kind === 'text' ? /^([^.:]{2,40})([.:]) /.exec(first.text) : null;
}

/**
 * A bulleted list sets its items' lead-ins apart only when every item has one,
 * so a list is styled one way throughout. Numbered lists never are.
 */
function List({ block }: { block: Extract<Block, { kind: 'list' }> }) {
  const leads = block.items.map(leadIn);
  const styled = !block.ordered && leads.every(Boolean);
  const items = block.items.map((nodes, j) => {
    const lead = leads[j];
    const first = nodes[0];
    if (!styled || !lead || first?.kind !== 'text') return <li key={j}><Inlines nodes={nodes} /></li>;
    const rest: Inline[] = [{ kind: 'text', text: first.text.slice(lead[0].length) }, ...nodes.slice(1)];
    return (
      <li key={j}>
        <span className="lead-in">{lead[1]}{lead[2]}</span> <Inlines nodes={rest} />
      </li>
    );
  });
  return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
}

export function Blocks({ blocks }: { blocks: Block[] }): ReactNode {
  return blocks.map((b, i) => {
    switch (b.kind) {
      case 'heading':
        return <Heading key={i} block={b} />;
      case 'paragraph':
        return <p key={i}><Inlines nodes={b.children} /></p>;
      case 'quote':
        return <blockquote key={i}><p><Inlines nodes={b.children} /></p></blockquote>;
      case 'list':
        return <List key={i} block={b} />;
      case 'table':
        return <Table key={i} head={b.head} rows={b.rows} />;
      case 'image':
        return (
          <figure key={i} className="content-figure">
            {/* Trusted SVG from content/, inlined so it uses the page's fonts. */}
            <div dangerouslySetInnerHTML={{ __html: loadFigure(b.src) }} />
            {b.alt && <figcaption>{b.alt}</figcaption>}
          </figure>
        );
      case 'container': {
        const Widget = WIDGETS[b.name];
        if (!Widget) throw new Error(`Unknown content block ":::${b.name}".`);
        return <Widget key={i} args={b.args} blocks={b.children} />;
      }
    }
  });
}

export const plainHeading = (nodes: Inline[]) => titleCase(inlineText(nodes));
