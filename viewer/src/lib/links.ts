/**
 * Every entry-to-entry link the catalog stores, read from public entry bodies
 * and named by coralmap's EdgeKind. Citations of sources are not links here;
 * they are counted from `claim_evidence`.
 */

export interface Link {
  from: string;
  to: string;
  kind: string;
  /** Attributes the link carries, such as a pathway part's `role` or an impact's `sign`. */
  attrs: Record<string, string | boolean>;
}

type Body = Record<string, unknown>;
type Raw = { id: string; type: string } & Body;

const asObject = (v: unknown): Body => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Body) : {});
const asList = (v: unknown): Body[] => (Array.isArray(v) ? v.map(asObject) : []);
const isId = (v: unknown): v is string => typeof v === 'string' && v.startsWith('kl-');

/** Ids in a field that may hold an id, an object naming one under `keys`, or a list of either. */
function idsIn(v: unknown, keys: string[] = ['id', 'pathway', 'impact', 'cluster', 'value']): string[] {
  if (isId(v)) return [v];
  if (Array.isArray(v)) return v.flatMap((x) => idsIn(x, keys));
  if (v && typeof v === 'object') {
    const key = keys.find((k) => isId((v as Body)[k]));
    return key ? [(v as Body)[key] as string] : [];
  }
  return [];
}

function attrsOf(pairs: Record<string, unknown>): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(pairs)) {
    if (typeof v === 'string' && v !== '') out[k] = v;
    else if (v === true) out[k] = true;
  }
  return out;
}

/** The links one entry asserts. A target may be missing from the library; `entryLinks` drops those. */
export function linksOf(entry: Raw): Link[] {
  const links: Link[] = [];
  const add = (to: string, kind: string, attrs: Record<string, unknown> = {}) =>
    links.push({ from: entry.id, to, kind, attrs: attrsOf(attrs) });
  const b = asObject(entry.body);

  switch (entry.type) {
    case 'pathway':
      for (const p of asList(b.composition_parts)) if (isId(p.id)) add(p.id, 'composition_parts', { role: p.role, absent: p.absent });
      for (const i of asList(b.impacts)) {
        if (isId(i.impact)) add(i.impact, 'impacts', { sign: i.sign, onset: i.onset_mode, horizon: i.horizon });
      }
      idsIn(b.mechanisms).forEach((id) => add(id, 'mechanisms'));
      idsIn(b.experience_cluster_candidate).forEach((id) => add(id, 'cluster_candidate'));
      idsIn(b.downstream, ['impact', 'id']).forEach((id) => add(id, 'downstream'));
      break;
    case 'experience_cluster':
      for (const c of asList(b.composed_of)) if (isId(c.pathway)) add(c.pathway, 'composed_of', { note: c.narrative_role });
      break;
    case 'mechanism':
      idsIn(b.instances).forEach((id) => add(id, 'instances'));
      break;
    case 'contrast':
      idsIn(b.members).forEach((id) => add(id, 'members'));
      for (const p of asList(b.discriminator)) if (isId(p.id)) add(p.id, 'discriminator', { role: p.role });
      break;
    case 'user_behavior':
      idsIn(b.condition_tags).forEach((id) => add(id, 'condition_tags'));
      break;
    case 'ai_behavior':
      idsIn(asObject(b.irreversibility).conditions).forEach((id) => add(id, 'irreversibility_conditions'));
      idsIn(b.reference_behavior).forEach((id) => add(id, 'reference_behavior'));
      break;
    case 'context_value':
      idsIn(b.dimension).forEach((id) => add(id, 'dimension'));
      idsIn(b.experience_clusters).forEach((id) => add(id, 'experience_clusters'));
      idsIn(b.covers).forEach((id) => add(id, 'covers'));
      break;
  }
  idsIn(entry.composed_of).forEach((id) => add(id, 'composed_of'));
  idsIn(asObject(entry.lifecycle).superseded_by).forEach((id) => add(id, 'superseded_by'));
  for (const d of asList(entry.distinguish_from)) if (isId(d.neighbor)) add(d.neighbor, 'distinguish_from');
  return links;
}

/** Every link between entries that are both in the library, and the ones whose target is not. */
export function entryLinks(entries: Raw[]): { links: Link[]; dangling: Link[] } {
  const known = new Set(entries.map((e) => e.id));
  const all = entries.flatMap(linksOf);
  return { links: all.filter((l) => known.has(l.to)), dangling: all.filter((l) => !known.has(l.to)) };
}
