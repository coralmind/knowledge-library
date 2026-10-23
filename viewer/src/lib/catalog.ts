/**
 * Counts over the public entries, for the numbers that page text states about
 * the catalog. Pages never hard-code such a number; content files name a fact
 * here instead (see `content/README.md`).
 *
 * Retired entries are left out of every count, except for a type whose
 * entries are all retired.
 */
import { entryIds, loadIndex, loadPublicEntry } from './artifacts';
import { entryLinks, type Link } from './links';
import type { EntryType, IndexRow } from './types';

export type Entry = Record<string, unknown> & { id: string; type: EntryType };
type Body = Record<string, unknown>;
type Part = { id?: string; kind?: string; role?: string; absent?: boolean; owed?: boolean };
type ImpactLink = { impact?: string; sign?: string };

export const present = (v: unknown): boolean =>
  !(v === null || v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0));

const bodyOf = (e: Entry): Body => (e.body && typeof e.body === 'object' ? (e.body as Body) : {});
const statusOf = (e: Entry): string | undefined => (e.lifecycle as { status?: string } | undefined)?.status;
const standingOf = (e: Entry): string | undefined => (e.standing as { value?: string } | undefined)?.value;

export class Catalog {
  readonly all: Entry[];
  readonly live: Entry[];
  readonly byId: Map<string, Entry>;
  readonly index: Map<string, IndexRow>;
  readonly facts: Record<string, number>;

  constructor(entries: Entry[], index: IndexRow[]) {
    this.all = entries;
    this.live = entries.filter((e) => statusOf(e) !== 'deprecated');
    this.byId = new Map(entries.map((e) => [e.id, e]));
    this.index = new Map(index.map((row) => [row.id, row]));
    this.facts = this.computeFacts();
  }

  private linkMaps: { from: Map<string, Link[]>; to: Map<string, Link[]> } | null = null;

  private links() {
    if (this.linkMaps === null) {
      const from = new Map<string, Link[]>();
      const to = new Map<string, Link[]>();
      for (const l of entryLinks(this.all).links) {
        from.set(l.from, [...(from.get(l.from) ?? []), l]);
        to.set(l.to, [...(to.get(l.to) ?? []), l]);
      }
      this.linkMaps = { from, to };
    }
    return this.linkMaps;
  }

  /** Links the entry asserts. */
  linksFrom(id: string): Link[] {
    return this.links().from.get(id) ?? [];
  }

  /** Links other entries assert to this one. */
  linksTo(id: string): Link[] {
    return this.links().to.get(id) ?? [];
  }

  of(type: string): Entry[] {
    const live = this.live.filter((e) => e.type === type);
    return live.length > 0 ? live : this.all.filter((e) => e.type === type);
  }

  /** Current entries of a type; `*` means every kind of entry except sources. */
  pool(type: string): Entry[] {
    return type === '*' ? this.live.filter((e) => e.type !== 'source') : this.of(type);
  }

  /** Entries of a type with a field filled in, read at the top level or in the body. */
  field(type: string, name: string): number {
    return this.pool(type).filter((e) => present(name in e ? e[name] : bodyOf(e)[name])).length;
  }

  /**
   * How often a stored value occurs at a glossary field path such as
   * `body.impacts[].sign`. A path with `[]` counts uses; one without counts entries.
   */
  uses(path: string, value: string): number {
    const steps = path.split('.');
    const pool = path === 'lifecycle.status' ? this.all : this.live;
    let n = 0;
    const walk = (v: unknown, rest: string[]): void => {
      if (rest.length === 0) {
        if (v !== null && v !== undefined && String(v) === value) n += 1;
        return;
      }
      const [head, ...tail] = rest as [string, ...string[]];
      const many = head.endsWith('[]');
      const next = v && typeof v === 'object' ? (v as Body)[head.replace(/\[\]$/, '')] : undefined;
      if (many) for (const item of Array.isArray(next) ? next : []) walk(item, tail);
      else walk(next, tail);
    };
    for (const e of pool) walk(e, steps);
    return n;
  }

  /** Whether `path` names something the catalog stores, so a page can show counts for it. */
  storesPath(path: string): boolean {
    return /^(type|layer|standing|lifecycle|claims|claim_evidence|sources|body)\b/.test(path);
  }

  /** Pathways with a link to the impact. */
  into(impactId: string): number {
    return this.of('pathway').filter((p) =>
      ((bodyOf(p).impacts as ImpactLink[] | undefined) ?? []).some((i) => i.impact === impactId),
    ).length;
  }

  /** Pathways a detected behavior makes candidates: it is one of their parts, not a condition and not one that must not occur. */
  candidates(behaviorId: string): number {
    return this.of('pathway').filter((p) =>
      ((bodyOf(p).composition_parts as Part[] | undefined) ?? []).some(
        (part) => part.id === behaviorId && part.role !== 'condition' && !part.absent,
      ),
    ).length;
  }

  /** How many of the named entries carry an evidence rating. */
  rated(value: string, ids: string[]): number {
    return ids.filter((id) => {
      const e = this.byId.get(id);
      if (!e) throw new Error(`No entry ${id}`);
      return standingOf(e) === value;
    }).length;
  }

  private computeFacts(): Record<string, number> {
    const pathways = this.of('pathway');
    const parts = pathways.flatMap((p) => (bodyOf(p).composition_parts as Part[] | undefined) ?? []);
    const partsOf = (p: Entry) => (bodyOf(p).composition_parts as Part[] | undefined) ?? [];
    const signs = (p: Entry) => new Set(((bodyOf(p).impacts as ImpactLink[] | undefined) ?? []).map((i) => i.sign));
    const irreversible = this.of('ai_behavior')
      .map((a) => bodyOf(a).irreversibility as { scope?: string; ratified?: boolean } | undefined)
      .filter((i): i is { scope?: string; ratified?: boolean } => present(i));
    const impacts = this.of('impact');
    const nonsource = this.pool('*');
    const claims = nonsource.flatMap((e) => ((e.claims as { id: string }[] | undefined) ?? []).map((c) => `${e.id}#${c.id}`));
    const sourced = new Set(
      nonsource.flatMap((e) =>
        ((e.claim_evidence as { claim_id?: string; source?: string }[] | undefined) ?? [])
          .filter((r) => r.source)
          .map((r) => `${e.id}#${r.claim_id}`),
      ),
    );
    const deployment = this.of('context_dimension').find((d) => /deploy/i.test(String(d.label)));

    return {
      'entries.nonsource': nonsource.length,
      'entries.reviewed': nonsource.filter((e) => statusOf(e) === 'active').length,
      'pathways.ai_only': pathways.filter((p) => !partsOf(p).some((x) => x.kind === 'user_behavior')).length,
      'pathways.with_condition': pathways.filter((p) =>
        partsOf(p).some((x) => x.role === 'condition' && x.kind === 'context_value'),
      ).length,
      'pathways.both_directions': pathways.filter((p) => {
        const s = signs(p);
        return (s.has('harmful') && s.has('protective')) || s.has('mixed');
      }).length,
      'pathways.counterpart_owed': this.field('pathway', 'counterpart_owed'),
      'pathways.with_mechanism': this.field('pathway', 'mechanisms'),
      'pathways.cluster_candidate': this.field('pathway', 'experience_cluster_candidate'),
      'parts.owed': parts.filter((x) => x.owed).length,
      'conditions.negated': parts.filter((x) => x.role === 'condition' && x.absent).length,
      'ai_behaviors.irreversible': irreversible.length,
      'ai_behaviors.irreversible_in_situations': irreversible.filter((i) => i.scope === 'condition_specific').length,
      'ai_behaviors.irreversible_approved': irreversible.filter((i) => i.ratified).length,
      'impacts.harms': impacts.filter((i) => bodyOf(i).valence === 'negative').length,
      'impacts.benefits': impacts.filter((i) => bodyOf(i).valence === 'positive').length,
      'claims.total': claims.length,
      'claims.unsourced': claims.filter((c) => !sourced.has(c)).length,
      'context.deployment_values': deployment
        ? this.of('context_value').filter((v) => bodyOf(v).dimension === deployment.id).length
        : 0,
    };
  }
}

/** What a named fact counts, for the hover text on the number. */
export const FACT_DESCRIPTIONS: Record<string, string> = {
  'entries.nonsource': 'Current entries that are not sources',
  'entries.reviewed': 'Entries reviewed by the expert council',
  'pathways.ai_only': 'Pathways with no user behavior among their parts',
  'pathways.with_condition': 'Pathways with a context value as a condition',
  'pathways.both_directions': 'Pathways with both a harmful and a protective link',
  'pathways.counterpart_owed': 'Pathways that name a well-handled counterpart not yet written',
  'pathways.with_mechanism': 'Pathways that name a mechanism',
  'pathways.cluster_candidate': 'Pathways flagged as possible members of a cluster',
  'parts.owed': 'Pathway parts that name a behavior with no entry yet',
  'conditions.negated': 'Conditions that must not hold',
  'ai_behaviors.irreversible': 'AI behaviors marked irreversible',
  'ai_behaviors.irreversible_in_situations': 'AI behaviors marked irreversible only in named situations',
  'ai_behaviors.irreversible_approved': 'Irreversible markings the expert council has approved',
  'impacts.harms': 'Impacts that are harms',
  'impacts.benefits': 'Impacts that are benefits',
  'claims.total': 'Claims made by current entries',
  'claims.unsourced': 'Claims with no source attached',
  'context.deployment_values': 'Values on the deployment dimension',
};

let cached: Catalog | null = null;

/** Every public entry, loaded once per process. */
export function loadCatalog(): Catalog {
  if (cached === null) {
    const entries = entryIds().map((id) => loadPublicEntry(id) as Entry);
    cached = new Catalog(entries, loadIndex());
  }
  return cached;
}
