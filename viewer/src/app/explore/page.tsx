/**
 * Explore: follow behaviors to the pathways they form and the impacts those
 * lead to, from a chosen entry or a cell of the map. State is in the URL and
 * resolved on the server, from the public catalog rows and links.
 */
import type { Metadata } from 'next';
import { FeedbackBand } from '../../components/FeedbackBand';
import { Trail } from '../../components/entry/Trail';
import { ExploreFlow } from '../../components/explore/ExploreFlow';
import { ExploreStart } from '../../components/explore/ExploreStart';
import { loadExploreContent, loadExploreGraph, selectFlows } from '../../lib/explore';
import { exploreHref, groupLabel, parseExploreQuery } from '../../lib/explore-url';

export const metadata: Metadata = { title: 'Explore · CoralMind Knowledge Library' };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseExploreQuery(await searchParams);
  const graph = loadExploreGraph();
  const content = loadExploreContent(graph);
  const root = query.root ? graph.rows.get(query.root) : undefined;
  const active = Boolean(root || query.group || query.domain || query.all);
  const trailLabel = root?.display_id ?? (query.group ? groupLabel(query.group) : query.all ? 'All pathways' : 'Explore');

  return (
    <>
      <div className="explore container">
        {active ? (
          <>
            <Trail href={exploreHref(query)} label={trailLabel} />
            <ExploreFlow graph={graph} query={query} flows={selectFlows(graph, query)} />
          </>
        ) : (
          <>
            <header className="catalog__head">
              <p className="eyebrow">Explore</p>
              <h1>{content.title}</h1>
              <p>{content.intro}</p>
            </header>
            <ExploreStart graph={graph} content={content} />
          </>
        )}
      </div>
      <FeedbackBand />
    </>
  );
}
