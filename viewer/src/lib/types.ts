/**
 * View-level types: what the viewer needs, not what an entry is.
 *
 * Entry bodies are `Record<string, unknown>` throughout. Ajv validates them
 * against `schema/*.schema.json` in `parse.ts`, and they are rendered
 * generically, so no module names an entry field.
 */

export const ENTRY_TYPES = [
  'pathway',
  'ai_behavior',
  'user_behavior',
  'impact',
  'context',
  'mechanism',
  'experience_cluster',
  'operator_action',
  'context_dimension',
  'context_value',
  'contrast',
  'divergence',
  'source',
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

export const TYPE_LABELS: Record<EntryType, string> = {
  pathway: 'Pathway',
  ai_behavior: 'AI behavior',
  user_behavior: 'User behavior',
  impact: 'Impact',
  context: 'Person context (retired)',
  mechanism: 'Mechanism',
  experience_cluster: 'Experience cluster',
  operator_action: 'Operator action',
  context_dimension: 'Context dimension',
  context_value: 'Context value',
  contrast: 'Contrast',
  divergence: 'Divergence',
  source: 'Source',
};

/**
 * Directory name to `type` value. Every pair is the singular of the directory
 * except `person_context`, whose entries carry `type: context`.
 */
export const DIR_TO_TYPE: Record<string, EntryType> = {
  pathways: 'pathway',
  ai_behaviors: 'ai_behavior',
  user_behaviors: 'user_behavior',
  impacts: 'impact',
  person_context: 'context',
  mechanisms: 'mechanism',
  experience_clusters: 'experience_cluster',
  operator_actions: 'operator_action',
  context_dimensions: 'context_dimension',
  context_values: 'context_value',
  contrasts: 'contrast',
  divergences: 'divergence',
  sources: 'source',
};

/**
 * The lifecycle vocabulary. A value list rather than a union type because
 * the catalog's status filter iterates it. `tests/types.test.ts` pins it
 * against the `LifecycleStatus` enum in `schema/`.
 */
export const LIFECYCLE_STATUSES = ['draft', 'active', 'deprecated'] as const;

export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

/**
 * One catalog row: only the fields the catalog filters on and shows on a card.
 * Full bodies are read per entry.
 */
export interface IndexRow {
  id: string;
  display_id: string;
  type: EntryType;
  label: string;
  /** How a pathway's composing parts combine; null on every other type. */
  composition_type: string | null;
  standing: string | null;
  status: LifecycleStatus | null;
}

export interface LibraryMeta {
  /** Content hash over the ingested entries -- identifies exactly what rendered. */
  digest: string;
  /** Package version from pyproject.toml, when readable. */
  version: string | null;
  generated_at: string;
  counts: Record<string, number>;
  /** Entry paths excluded by `lib/quarantine.ts`, so a page can report N of M. */
  quarantined: string[];
}
