/** How an evaluation uses the Knowledge Library, from content/guide/evaluation.md. */
import type { Metadata } from 'next';
import { GuideDocument, guideTitle } from '../../../components/GuideDocument';

const PATH = 'guide/evaluation.md';

export function generateMetadata(): Metadata {
  return { title: `${guideTitle(PATH)} · CoralMind Knowledge Library` };
}

export default function EvaluationPage() {
  return <GuideDocument path={PATH} current="/guide/evaluation" />;
}
