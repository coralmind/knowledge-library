/** Every kind of entry and every field, from content/guide/reference.md. */
import type { Metadata } from 'next';
import { GuideDocument, guideTitle } from '../../../components/GuideDocument';

const PATH = 'guide/reference.md';

export function generateMetadata(): Metadata {
  return { title: `${guideTitle(PATH)} · CoralMind Knowledge Library` };
}

export default function ReferencePage() {
  return <GuideDocument path={PATH} current="/guide/reference" />;
}
