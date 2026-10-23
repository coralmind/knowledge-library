/** The introduction: the library in five steps, from content/introduction.md. */
import type { Metadata } from 'next';
import { Blocks } from '../components/content/Markdown';
import { FeedbackBand } from '../components/FeedbackBand';
import { loadDocument } from '../lib/content/load';

const PATH = 'introduction.md';

export function generateMetadata(): Metadata {
  const { meta } = loadDocument(PATH);
  return {
    title: `${String(meta.title ?? 'Knowledge Library')} · CoralMind`,
    ...(meta.description ? { description: String(meta.description) } : {}),
  };
}

export default function IntroductionPage() {
  return (
    <>
      <div className="home">
        <Blocks blocks={loadDocument(PATH).blocks} />
      </div>
      <FeedbackBand />
    </>
  );
}
