/** One guide page rendered from its content file: title and opening, then the sections. */
import { loadMeta } from '../lib/artifacts';
import { inlineText } from '../lib/content/markdown';
import { loadDocument, outline } from '../lib/content/load';
import { titleCase } from '../lib/titlecase';
import { Blocks, Inlines } from './content/Markdown';
import { FeedbackBand } from './FeedbackBand';
import { CountedNote, GuideShell, type GuideHref } from './GuideShell';

export function guideTitle(path: string): string {
  const title = loadDocument(path).blocks.find((b) => b.kind === 'heading' && b.level === 1);
  return title?.kind === 'heading' ? titleCase(inlineText(title.children)) : 'Guide';
}

export function GuideDocument({ path, current }: { path: string; current: GuideHref }) {
  const { blocks } = loadDocument(path);
  const meta = loadMeta();
  const titleAt = blocks.findIndex((b) => b.kind === 'heading' && b.level === 1);
  const title = blocks[titleAt];
  const firstSection = blocks.findIndex((b) => b.kind === 'heading' && b.level === 2);
  const opening = blocks.slice(titleAt + 1, firstSection < 0 ? undefined : firstSection);
  const sections = firstSection < 0 ? [] : blocks.slice(firstSection);

  return (
    <>
      <GuideShell current={current} outline={outline(sections)}>
        <header className="prose__head">
          {title?.kind === 'heading' && <h1><Inlines nodes={title.children} title /></h1>}
          <Blocks blocks={opening} />
          <CountedNote version={meta.version} digest={meta.digest} />
        </header>
        <Blocks blocks={sections} />
      </GuideShell>
      <FeedbackBand />
    </>
  );
}
