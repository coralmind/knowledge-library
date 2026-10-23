/**
 * Entries in left-to-right columns with the links between them, drawn as SVG
 * on the server. Each node links to its entry; hovering one traces every path
 * through it.
 */
import { loadCatalog } from '../lib/catalog';
import { plainName, RATING_SCALE, ratingStep } from '../lib/glossary';
import { GraphTrace, type PinDetail } from './GraphTrace';
import { RatingMeter } from './RatingMeter';

/** What a node shows. */
export interface GraphNode {
  display_id: string;
  label: string;
  type: string;
  standing: string | null;
  definition?: string | null;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** `harmful`, `protective` or `condition`, which set the line style. */
  kind?: string | undefined;
  title?: string | undefined;
}

const H = 54;
const VGAP = 8;
const TOP = 30;

function wrap(text: string, width: number, lines = 2): string[] {
  const out = [''];
  for (const word of text.split(/\s+/)) {
    const cur = out[out.length - 1] ?? '';
    if (`${cur} ${word}`.trim().length <= width) out[out.length - 1] = `${cur} ${word}`.trim();
    else if (out.length === lines) {
      out[out.length - 1] = `${cur.replace(/.{0,2}$/, '')}…`;
      return out;
    } else out.push(word);
  }
  return out;
}

export function LayeredGraph({
  columns,
  edges,
  heads = [],
  root,
  label,
  nodeWidth: W = 260,
  gap: GAP = 90,
  nodeOf,
  pin,
}: {
  columns: string[][];
  edges: GraphEdge[];
  heads?: string[];
  root?: string;
  label: string;
  nodeWidth?: number;
  gap?: number;
  /** Looks a node up; defaults to the full catalog, which only prerendered pages can read. */
  nodeOf?: (id: string) => GraphNode | undefined;
  /** On Explore: a click pins the node, with its details and links to explore from it, keeping this sign filter. */
  pin?: { sign: string | null };
}) {
  const lookup: (id: string) => GraphNode | undefined = nodeOf ?? ((id) => loadCatalog().index.get(id));
  const cols = columns.map((c) => c.filter((id) => lookup(id) !== undefined));
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    adj.set(e.from, [...(adj.get(e.from) ?? []), e.to]);
    adj.set(e.to, [...(adj.get(e.to) ?? []), e.from]);
  }

  // Order each column by the mean position of its neighbours, to reduce crossings.
  const idx = new Map<string, number>();
  const setIdx = (c: string[]) => c.forEach((id, i) => idx.set(id, i));
  cols.forEach(setIdx);
  const bary = (id: string) => {
    const ns = (adj.get(id) ?? []).filter((x) => idx.has(x));
    return ns.length ? ns.reduce((s, x) => s + (idx.get(x) ?? 0), 0) / ns.length : 1e9;
  };
  for (let pass = 0; pass < 3; pass += 1) {
    for (let c = 1; c < cols.length; c += 1) setIdx((cols[c] ?? []).sort((a, b) => bary(a) - bary(b)));
    for (let c = cols.length - 2; c >= 0; c -= 1) setIdx((cols[c] ?? []).sort((a, b) => bary(a) - bary(b)));
  }

  // The tallest column sets the rhythm; every other node sits level with its placed neighbours.
  const pos = new Map<string, { x: number; y: number }>();
  const anchor = cols.reduce((best, c, i) => (c.length > (cols[best]?.length ?? 0) ? i : best), 0);
  const x = (ci: number) => 10 + ci * (W + GAP);
  (cols[anchor] ?? []).forEach((id, i) => pos.set(id, { x: x(anchor), y: TOP + i * (H + VGAP) }));
  const place = (ci: number) => {
    let next = TOP;
    (cols[ci] ?? [])
      .map((id) => {
        const ys = (adj.get(id) ?? []).flatMap((n) => (pos.has(n) ? [pos.get(n)!.y] : []));
        return { id, y: ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : TOP };
      })
      .sort((a, b) => a.y - b.y)
      .forEach(({ id, y }) => {
        const at = Math.max(y, next);
        pos.set(id, { x: x(ci), y: at });
        next = at + H + VGAP;
      });
  };
  for (let c = anchor + 1; c < cols.length; c += 1) place(c);
  for (let c = anchor - 1; c >= 0; c -= 1) place(c);

  const pinDetails = () =>
    Object.fromEntries(
      [...pos.keys()].flatMap((id): [string, PinDetail][] => {
        const n = lookup(id);
        if (!n) return [];
        return [
          [
            id,
            {
              type: n.type,
              head: (
                <>
                  <span className="mono muted">{n.display_id}</span>
                  <b>{n.label}</b>
                  <RatingMeter value={n.standing} />
                </>
              ),
              definition: n.definition ?? null,
            },
          ],
        ];
      }),
    );

  const top = heads.length ? TOP : 12;
  if (top !== TOP) for (const p of pos.values()) p.y -= TOP - top;
  const height = Math.max(top, ...[...pos.values()].map((p) => p.y)) + H + 12;
  const width = 20 + cols.length * W + (cols.length - 1) * GAP;

  return (
    <GraphTrace pin={pin && { ...pin, root: root ?? null }} details={pin ? pinDetails() : undefined}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {heads.map((h, ci) => (
          <text key={h} className="graph__head" x={x(ci)} y={16}>{h}</text>
        ))}
        {edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
          return (
            <path key={i} data-f={e.from} data-t={e.to} className={`graph__edge${e.kind ? ` graph__edge--${e.kind}` : ''}`} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}>
              {e.title && <title>{e.title}</title>}
            </path>
          );
        })}
        {[...pos].map(([id, p]) => {
          const row = lookup(id);
          if (!row) return null;
          const step = ratingStep(row.standing);
          return (
            <a key={id} href={`/entry/${id}`} data-id={id} data-type={row.type} aria-label={`${row.display_id}: ${row.label}`}>
              <g className={`graph__node${id === root ? ' graph__node--root' : ''}`} data-type={row.type} transform={`translate(${p.x},${p.y})`}>
                <rect className="graph__box" width={W} height={H} rx={8} />
                <rect className="graph__bar" width={4} height={H} rx={2} />
                <text className="graph__id" x={12} y={15}>{row.display_id}</text>
                {step >= 0 && (
                  <g className="graph__meter">
                    <title>{`Evidence rating: ${plainName('Standing', row.standing)}`}</title>
                    {RATING_SCALE.map((v, i) => (
                      <rect key={v} className={i <= step ? 'on' : undefined} x={W - 52 + i * 7} y={7} width={5} height={10} rx={1} />
                    ))}
                  </g>
                )}
                {wrap(row.label, Math.floor((W - 22) / 6.6)).map((line, i) => (
                  <text key={i} className="graph__label" x={12} y={31 + i * 15}>{line}</text>
                ))}
              </g>
            </a>
          );
        })}
      </svg>
    </GraphTrace>
  );
}

type Part = { id?: string; role?: string };
type ImpactLink = { impact?: string; sign?: string; onset_mode?: string; horizon?: string };

/** One pathway: its parts on the left, the impacts it leads to on the right. */
export function PathwayGraph({ id }: { id: string }) {
  const entry = loadCatalog().byId.get(id);
  if (!entry || entry.type !== 'pathway') throw new Error(`${id} is not a pathway.`);
  const body = entry.body as { composition_parts?: Part[]; impacts?: ImpactLink[] };
  const parts = (body.composition_parts ?? []).filter((p): p is Part & { id: string } => typeof p.id === 'string' && p.id.startsWith('kl-'));
  const impacts = (body.impacts ?? []).filter((i): i is ImpactLink & { impact: string } => typeof i.impact === 'string');
  const edges: GraphEdge[] = [
    ...parts.map((p) => ({ from: p.id, to: id, kind: p.role === 'condition' ? 'condition' : undefined, title: plainName('PartRole', p.role) })),
    ...impacts.map((i) => ({
      from: id,
      to: i.impact,
      kind: i.sign,
      title: [plainName('Sign', i.sign), plainName('OnsetMode', i.onset_mode), plainName('Horizon', i.horizon)].filter(Boolean).join(' · '),
    })),
  ];
  return (
    <LayeredGraph
      columns={[parts.map((p) => p.id), [id], impacts.map((i) => i.impact)]}
      edges={edges}
      heads={['Parts', 'Pathway', 'Impacts']}
      root={id}
      label={`${entry.label}: its parts and the impacts it leads to`}
    />
  );
}
