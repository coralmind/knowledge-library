/**
 * The shared glossary: the plain name and meaning of every stored value a
 * reader meets, and the definitions of the terms the guide uses. Pages show a
 * stored value through `plainName`, never as the raw value.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export interface GlossaryValue {
  value: string;
  name: string;
  meaning: string;
}

export interface GlossaryList {
  name: string;
  /** Where the value is stored, such as `body.impacts[].sign`. */
  field: string;
  /** The schema enum the list covers, when there is one. */
  vocabulary?: string;
  question: string;
  values: GlossaryValue[];
}

export interface Glossary {
  title: string;
  intro: string;
  terms: { term: string; definition: string }[];
  lists: GlossaryList[];
}

/** Editable page content lives beside `src/`, so writers never open a component. */
export function contentDir(): string {
  return process.env.KL_CONTENT_DIR ?? join(process.cwd(), 'content');
}

const squash = (text: unknown): string => String(text ?? '').replace(/\s+/g, ' ').trim();

let cached: Glossary | null = null;

export function loadGlossary(): Glossary {
  if (cached !== null) return cached;
  const raw = parse(readFileSync(join(contentDir(), 'glossary.yaml'), 'utf-8')) as {
    title?: string;
    intro?: string;
    terms?: { term: string; definition: string }[];
    lists?: (Omit<GlossaryList, 'values'> & { values: { value: unknown; name: string; meaning: string }[] })[];
  };
  cached = {
    title: squash(raw.title ?? 'Glossary'),
    intro: squash(raw.intro),
    terms: (raw.terms ?? []).map((t) => ({ term: squash(t.term), definition: squash(t.definition) })),
    lists: (raw.lists ?? []).map((list) => ({
      ...list,
      question: squash(list.question),
      values: list.values.map((v) => ({ value: String(v.value), name: squash(v.name), meaning: squash(v.meaning) })),
    })),
  };
  return cached;
}

export function glossaryList(vocabulary: string): GlossaryList | undefined {
  return loadGlossary().lists.find((list) => list.vocabulary === vocabulary);
}

export function plainValue(vocabulary: string, value: string | null | undefined): GlossaryValue | undefined {
  if (value === null || value === undefined) return undefined;
  return glossaryList(vocabulary)?.values.find((v) => v.value === value);
}

/** The plain name, or the stored value itself when the glossary has no entry for it. */
export function plainName(vocabulary: string, value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return plainValue(vocabulary, value)?.name ?? value;
}

/** The six evidence ratings in order, weakest first; the other ratings sit outside the scale. */
export const RATING_SCALE = [
  'plausible_unobserved',
  'theorized',
  'extrapolated_from_clinical',
  'externally_classified',
  'observed_self_report',
  'observed_in_transcripts',
] as const;

export function ratingStep(value: string | null | undefined): number {
  return value ? (RATING_SCALE as readonly string[]).indexOf(value) : -1;
}

export const slug = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
