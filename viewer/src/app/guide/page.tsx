/** How the library works: the guide, from content/guide/how-the-library-works.md. */
import type { Metadata } from 'next';
import { GuideDocument, guideTitle } from '../../components/GuideDocument';

const PATH = 'guide/how-the-library-works.md';

export function generateMetadata(): Metadata {
  return { title: `${guideTitle(PATH)} · CoralMind Knowledge Library` };
}

export default function GuidePage() {
  return <GuideDocument path={PATH} current="/guide" />;
}
