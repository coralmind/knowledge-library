/**
 * The `:::name` blocks a content file can use. Each takes the block's
 * arguments and the content inside it; the catalog supplies everything else.
 * Content says what a block is, never how it looks.
 */
import type { ReactNode } from 'react';
import { browseHref } from '../../lib/browse-url';
import { loadCatalog, type Entry } from '../../lib/catalog';
import { guideSection, guideStep, loadDocument } from '../../lib/content/load';
import type { Block, Inline } from '../../lib/content/markdown';
import { glossaryList, plainName, RATING_SCALE } from '../../lib/glossary';
import { TYPE_LABELS, type EntryType } from '../../lib/types';
import { EntryRef } from '../EntryRef';
import { PathwayGraph } from '../PathwayGraph';
import { Meter, RatingMeter } from '../RatingMeter';
import { Blocks, Inlines } from './Markdown';

export interface WidgetProps {
  args: string[];
  blocks: Block[];
}

const option = (args: string[], key: string): string | undefined =>
  args.find((a) => a.startsWith(`${key}=`))?.slice(key.length + 1);

const tableIn = (blocks: Block[]) => blocks.find((b): b is Extract<Block, { kind: 'table' }> => b.kind === 'table');
const listIn = (blocks: Block[]) => blocks.find((b): b is Extract<Block, { kind: 'list' }> => b.kind === 'list');
const textOf = (cell: Inline[] = []) => cell.map((n) => (n.kind === 'text' || n.kind === 'code' ? n.text : '')).join('').trim();

/** A paragraph that is only a link renders as the brand's arrow link. */
function ArrowLink({ link }: { link: Extract<Inline, { kind: 'link' }> }) {
  const external = /^https?:/.test(link.href);
  return (
    <a className="cm-arrow-link" href={link.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      <span className="cm-arrow-link__label"><Inlines nodes={link.children} /></span>
      <span aria-hidden="true">→</span>
    </a>
  );
}

function CardBody({ blocks }: { blocks: Block[] }) {
  return blocks.map((b, i) => {
    const only = b.kind === 'paragraph' && b.children.length === 1 ? b.children[0] : undefined;
    if (only?.kind === 'link') return <ArrowLink key={i} link={only} />;
    return <Blocks key={i} blocks={[b]} />;
  });
}

/** The values of one glossary list, with plain names, meanings and, optionally, how often each occurs. */
function Values({ args }: WidgetProps) {
  const [vocabulary = ''] = args;
  const list = glossaryList(vocabulary);
  if (!list) throw new Error(`:::values names no glossary list for "${vocabulary}".`);
  const scale = args.includes('scale');
  const countPath = option(args, 'count');
  const values = scale ? list.values.filter((v) => (RATING_SCALE as readonly string[]).includes(v.value)) : list.values;
  const catalog = loadCatalog();
  return (
    <div className="content-table">
      <table>
        <thead>
          <tr>
            <th scope="col">Plain name</th>
            <th scope="col">What it means</th>
            <th scope="col">Stored value</th>
            {countPath && <th scope="col">In the catalog</th>}
          </tr>
        </thead>
        <tbody>
          {values.map((v) => (
            <tr key={v.value}>
              <td>{scale && <Meter value={v.value} />}{v.name}</td>
              <td>{v.meaning}</td>
              <td><code>{v.value}</code></td>
              {countPath && <td className="num">{catalog.uses(countPath, v.value)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Stages and numbered steps from a table of Stage | "N. Step" | What it produces. Each step links to its section. */
function Pipeline({ blocks }: WidgetProps) {
  const table = tableIn(blocks);
  if (!table) throw new Error(':::pipeline needs a table of stages and steps.');
  const stages = new Map<string, { n: string; step: Inline[]; produces: Inline[] }[]>();
  for (const [stage = [], step = [], produces = []] of table.rows) {
    const first = step[0];
    const m = first?.kind === 'text' ? /^(\d+)\.\s*/.exec(first.text) : null;
    const rest: Inline[] = m && first?.kind === 'text' ? [{ kind: 'text', text: first.text.slice(m[0].length) }, ...step.slice(1)] : step;
    const key = textOf(stage);
    stages.set(key, [...(stages.get(key) ?? []), { n: m?.[1] ?? '', step: rest, produces }]);
  }
  return (
    <div className="pipeline">
      {[...stages].map(([stage, steps]) => (
        <section className="pipeline-stage" key={stage} aria-label={stage}>
          <p className="pipeline-stage__name">{stage}</p>
          <ol>
            {steps.map((s) => (
              <li key={s.n}>
                <a href={`#step-${s.n}`}>
                  <span className="pipeline-step__n">{s.n}</span>
                  <span className="pipeline-step__name"><Inlines nodes={s.step} /></span>
                  <span className="pipeline-step__out"><Inlines nodes={s.produces} /></span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** A card's example: an entry or two that show the card's point, or a note that none is written yet. */
function CardExample({ nodes }: { nodes: Inline[] }) {
  if (nodes.length === 1 && nodes[0]?.kind === 'text' && /^no entries yet\.?$/i.test(nodes[0].text.trim())) {
    return <p className="card-example"><span className="chip">No entries yet</span></p>;
  }
  return <p className="card-example"><Inlines nodes={nodes} /></p>;
}

/**
 * Cards from table rows (first cell is the title) or from `###` sections.
 * With `from=HEADING-ID` the table comes from the guide, and a list inside the
 * block adds one example to each card, in order.
 */
function Cards({ args, blocks }: WidgetProps) {
  const variant = args[0] && !args[0].includes('=') ? args[0] : undefined;
  const from = option(args, 'from');
  const table = tableIn(from ? guideSection(from) : blocks);
  const examples = from ? (listIn(blocks)?.items ?? []) : [];
  let cards: { title: Inline[]; body: ReactNode }[];
  if (table) {
    cards = table.rows.map(([title = [], ...rest], r) => ({
      title,
      body: (
        <>
          {rest.map((cell, i) => <p key={i} className={i > 0 ? 'muted' : undefined}><Inlines nodes={cell} /></p>)}
          {examples[r] && <CardExample nodes={examples[r]} />}
        </>
      ),
    }));
  } else {
    const groups: { title: Inline[]; blocks: Block[] }[] = [];
    for (const b of blocks) {
      if (b.kind === 'heading' && b.level === 3) groups.push({ title: b.children, blocks: [] });
      else groups[groups.length - 1]?.blocks.push(b);
    }
    cards = groups.map((g) => ({ title: g.title, body: <CardBody blocks={g.blocks} /> }));
  }
  return (
    <div className={`cards${variant ? ` cards--${variant}` : ''}`}>
      {cards.map((c, i) => (
        <article className="cm-card" key={i}>
          {variant === 'numbered' && <span className="card-number" aria-hidden="true">{i + 1}</span>}
          <h3><Inlines nodes={c.title} title /></h3>
          {c.body}
        </article>
      ))}
    </div>
  );
}

function Note({ args, blocks }: WidgetProps) {
  return (
    <aside className="note">
      <p className="eyebrow">{args.join(' ')}</p>
      <Blocks blocks={blocks} />
    </aside>
  );
}

/* ---------- Home page ---------- */

/** The page's opening. Its title is a sentence, so it keeps sentence case. */
function Hero({ blocks }: WidgetProps) {
  const figures = blocks.filter((b) => b.kind === 'image');
  const below = blocks.filter((b) => b.kind === 'container' && b.name === 'step-list');
  const rest = blocks.filter((b) => b.kind !== 'image' && !below.includes(b));
  return (
    <section className="hero">
      <div className="hero__inner">
        <div className="hero__text">
          {rest.map((b, i) =>
            b.kind === 'heading' && b.level === 1 ? (
              <h1 key={i} id={b.id}><Inlines nodes={b.children} /></h1>
            ) : (
              <Blocks key={i} blocks={[b]} />
            ),
          )}
        </div>
        {figures.length > 0 && <div className="hero__figure"><Blocks blocks={figures} /></div>}
      </div>
      {below.length > 0 && <div className="hero__below"><Blocks blocks={below} /></div>}
    </section>
  );
}

/** Links to the page's steps, named by the guide's own step headings. */
function StepList() {
  const steps = loadDocument('guide/how-the-library-works.md').blocks.filter(
    (b): b is Extract<Block, { kind: 'heading' }> => b.kind === 'heading' && b.level === 2 && b.step !== undefined,
  );
  return (
    <nav aria-label="The five steps">
      <ol className="step-list">
        {steps.map((s) => (
          <li key={s.id}>
            <a href={`#step-${s.step}`}><Inlines nodes={s.children} title /></a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** A list of "{{count}} label" lines as a row of large numbers. */
function Stats({ blocks }: WidgetProps) {
  const list = listIn(blocks);
  return (
    <dl className="stat-row">
      {list?.items.map((item, i) => (
        <div key={i}>
          <dt><Inlines nodes={item.slice(0, 1)} /></dt>
          <dd><Inlines nodes={item.slice(1)} /></dd>
        </div>
      ))}
    </dl>
  );
}

/** Kinds of entry that share a dot color, named together in the key. */
const DOT_GROUPS: { type: EntryType; name: string }[] = [
  { type: 'ai_behavior', name: TYPE_LABELS.ai_behavior },
  { type: 'user_behavior', name: TYPE_LABELS.user_behavior },
  { type: 'pathway', name: TYPE_LABELS.pathway },
  { type: 'impact', name: TYPE_LABELS.impact },
  { type: 'context_value', name: 'Context' },
  { type: 'operator_action', name: TYPE_LABELS.operator_action },
  { type: 'mechanism', name: 'Mechanism, experience cluster, contrast or source' },
];

/** A key to the colored dots that mark an entry's kind wherever an entry is named. */
function TypeKey({ blocks }: WidgetProps) {
  return (
    <div className="chips type-key">
      <span className="chips__label"><Blocks blocks={blocks} /></span>
      {DOT_GROUPS.map((g) => (
        <span key={g.type} className="chip" data-type={g.type}>
          <span className="type-dot" aria-hidden="true" />
          {g.name}
        </span>
      ))}
    </div>
  );
}

/** A list of links as buttons; the first is the page's one primary action. */
function Actions({ blocks }: WidgetProps) {
  const list = listIn(blocks);
  return (
    <div className="actions">
      {list?.items.map((item, i) => {
        const link = item.find((n): n is Extract<Inline, { kind: 'link' }> => n.kind === 'link');
        if (!link) return null;
        return (
          <a key={i} className={`cm-btn${i === 0 ? ' cm-btn--primary' : ''}`} href={link.href}>
            <Inlines nodes={link.children} />
          </a>
        );
      })}
    </div>
  );
}

/** Blocks too wide for a column. From the first of these on, a step's material runs the full width. */
const WIDE = new Set(['pathway-graph', 'cards', 'impact-domains', 'rating-ladder']);

/** One of the guide's five steps: its heading and opening paragraphs from the guide, then this block's own material. */
function Step({ args, blocks }: WidgetProps) {
  const n = Number(args[0]);
  const { heading, blocks: opening } = guideStep(n, Number(option(args, 'paragraphs') ?? 1));
  const aside = blocks.filter((b) => b.kind === 'container' && b.name === 'aside');
  const main = blocks.filter((b) => !(b.kind === 'container' && b.name === 'aside'));
  const wideAt = main.findIndex((b) => b.kind === 'container' && WIDE.has(b.name));
  const narrow = wideAt < 0 ? main : main.slice(0, wideAt);
  const wide = wideAt < 0 ? [] : main.slice(wideAt);
  return (
    <section className="home-step" id={`step-${n}`}>
      <div className="home-step__inner">
        <p className="eyebrow">Step {n}</p>
        <h2><Inlines nodes={heading} title /></h2>
        <div className={aside.length ? 'home-step__columns' : 'home-step__text'}>
          <div>
            <Blocks blocks={opening} />
            <Blocks blocks={narrow} />
          </div>
          {aside.length > 0 && <div><Blocks blocks={aside.flatMap((a) => (a.kind === 'container' ? a.children : []))} /></div>}
        </div>
        {wide.length > 0 && <div className="home-step__wide"><Blocks blocks={wide} /></div>}
        <p className="more"><a href={`/guide#step-${n}`}>Read step {n} in the guide →</a></p>
      </div>
    </section>
  );
}

function Aside({ blocks }: WidgetProps) {
  return <div className="aside"><Blocks blocks={blocks} /></div>;
}

/** A schematic exchange: "Person: ..." and "AI: ..." list items, then an optional caption. */
function Transcript({ blocks }: WidgetProps) {
  const list = listIn(blocks);
  const caption = blocks.filter((b) => b.kind !== 'list');
  return (
    <figure className="transcript-figure">
      <div className="transcript-turns">
        {list?.items.map((item, i) => {
          const first = item[0];
          const m = first?.kind === 'text' ? /^(\w+):\s*/.exec(first.text) : null;
          const rest: Inline[] = m && first?.kind === 'text' ? [{ kind: 'text', text: first.text.slice(m[0].length) }, ...item.slice(1)] : item;
          return (
            <p key={i} className="transcript-turn">
              {m && <span className="transcript-turn__who">{m[1]}</span>}
              <Inlines nodes={rest} />
            </p>
          );
        })}
      </div>
      {caption.length > 0 && <figcaption><Blocks blocks={caption} /></figcaption>}
    </figure>
  );
}

/** The opening of a behavior's "what to look for" criteria, read from the entry. */
function Criteria({ args }: WidgetProps) {
  const [id = ''] = args;
  const entry = loadCatalog().byId.get(id);
  const body = (entry?.body ?? {}) as { observable_criteria?: unknown };
  const text = typeof body.observable_criteria === 'string' ? body.observable_criteria : '';
  const dash = text.indexOf(' —');
  const excerpt = `${(dash > 0 ? text.slice(0, dash) : text.slice(0, 330)).trim()}…`;
  return (
    <p className="criteria">
      What to look for in <EntryRef id={id} />: <span className="criteria__text">{excerpt}</span>
    </p>
  );
}

/** A glossary list as chips, each with its meaning on hover and, with `count=path`, how often it occurs. */
function Chips({ args, blocks }: WidgetProps) {
  const [vocabulary = ''] = args;
  const list = glossaryList(vocabulary);
  if (!list) throw new Error(`:::chips names no glossary list for "${vocabulary}".`);
  const countPath = option(args, 'count');
  const catalog = loadCatalog();
  return (
    <div className="chips">
      <span className="chips__label"><Blocks blocks={blocks} /></span>
      {list.values.map((v) => {
        const n = countPath ? catalog.uses(countPath, v.value) : null;
        if (n === 0) return null;
        return (
          <span key={v.value} className="chip" title={v.meaning}>
            {v.name}{n !== null && ` · ${n}`}
          </span>
        );
      })}
    </div>
  );
}

function PathwayFigure({ args, blocks }: WidgetProps) {
  const [id = ''] = args;
  return (
    <figure className="graph-figure">
      <PathwayGraph id={id} />
      <figcaption><Blocks blocks={blocks} /></figcaption>
    </figure>
  );
}

/** Impact areas of life, each with its count and every impact in it, those most pathways lead to first. */
function ImpactDomains() {
  const catalog = loadCatalog();
  const impacts = catalog.of('impact');
  const inDegree = (id: string) => catalog.into(id);
  const domains = new Map<string, Entry[]>();
  for (const i of impacts) {
    const d = String((i.body as { domain?: string }).domain ?? '');
    domains.set(d, [...(domains.get(d) ?? []), i]);
  }
  return (
    <div className="domains">
      {[...domains]
        .sort(([a], [b]) => plainName('ImpactDomain', a).localeCompare(plainName('ImpactDomain', b)))
        .map(([d, xs]) => {
          const benefits = xs.filter((x) => (x.body as { valence?: string }).valence === 'positive').length;
          const top = [...xs].sort((a, b) => inDegree(b.id) - inDegree(a.id));
          return (
            <article className="cm-card domain" key={d}>
              <h3>
                <a href={browseHref({ type: 'impact', sec: d })}>{plainName('ImpactDomain', d)}</a>
              </h3>
              <p className="muted">
                {xs.length} {xs.length === 1 ? 'impact' : 'impacts'}
                {benefits > 0 && ` · ${benefits} protective`}
              </p>
              <ul>{top.map((x) => <li key={x.id}><EntryRef id={x.id} /></li>)}</ul>
            </article>
          );
        })}
    </div>
  );
}

/** The six evidence ratings as a ladder, each with how many entries hold it. */
function RatingLadder() {
  const catalog = loadCatalog();
  const list = glossaryList('Standing');
  return (
    <div className="ladder">
      {RATING_SCALE.map((v, i) => {
        const n = catalog.uses('standing.value', v);
        return (
          <div className="ladder__rung" key={v}>
            <div className="ladder__barbox">
              <div className="ladder__bar" style={{ height: `${18 + i * 12}px` }} data-step={i} />
            </div>
            <RatingMeter value={v} />
            <p className="ladder__count">{n} {n === 1 ? 'entry' : 'entries'}</p>
            <p className="ladder__meaning">{list?.values.find((x) => x.value === v)?.meaning}</p>
          </div>
        );
      })}
    </div>
  );
}

/** The guide's text under one heading, shown here so the two stay the same. */
function FromGuide({ args }: WidgetProps) {
  return <Blocks blocks={guideSection(args[0] ?? '')} />;
}

function Start({ blocks }: WidgetProps) {
  return (
    <section className="home-start" id="start">
      <div className="home-step__inner"><Blocks blocks={blocks} /></div>
    </section>
  );
}

export const WIDGETS: Record<string, (props: WidgetProps) => ReactNode> = {
  values: Values,
  pipeline: Pipeline,
  cards: Cards,
  note: Note,
  hero: Hero,
  stats: Stats,
  actions: Actions,
  step: Step,
  aside: Aside,
  transcript: Transcript,
  criteria: Criteria,
  chips: Chips,
  'pathway-graph': PathwayFigure,
  'impact-domains': ImpactDomains,
  'rating-ladder': RatingLadder,
  'from-guide': FromGuide,
  'step-list': StepList,
  'type-key': TypeKey,
  start: Start,
};
