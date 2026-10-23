/** Every term, then every stored value with its plain name, from content/glossary.yaml. */
import type { Metadata } from 'next';
import { FeedbackBand } from '../../../components/FeedbackBand';
import { GuideShell } from '../../../components/GuideShell';
import { Meter } from '../../../components/RatingMeter';
import { loadCatalog } from '../../../lib/catalog';
import { loadGlossary, RATING_SCALE, slug } from '../../../lib/glossary';
import { titleCase } from '../../../lib/titlecase';

export const metadata: Metadata = { title: 'Glossary · CoralMind Knowledge Library' };

export default function GlossaryPage() {
  const glossary = loadGlossary();
  const catalog = loadCatalog();
  const terms = [...glossary.terms].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const outline = [
    { id: 'terms', title: [{ kind: 'text' as const, text: 'Terms' }], sub: false },
    ...glossary.lists.map((l) => ({ id: `list-${slug(l.name)}`, title: [{ kind: 'text' as const, text: l.name }], sub: true })),
  ];

  return (
    <>
      <GuideShell current="/guide/glossary" outline={outline}>
        <header className="prose__head">
          <h1>{glossary.title}</h1>
          <p>{glossary.intro}</p>
        </header>

        <section className="glossary-section" aria-labelledby="terms">
          <h2 id="terms">Terms</h2>
          <dl className="glossary-terms">
            {terms.map((t) => (
              <div key={t.term} id={`term-${slug(t.term)}`}>
                <dt>{t.term}</dt>
                <dd>{t.definition}</dd>
              </div>
            ))}
          </dl>
        </section>

        {glossary.lists.map((list) => {
          const counted = catalog.storesPath(list.field);
          const perUse = list.field.includes('[]');
          return (
            <section className="glossary-section" key={list.name} aria-labelledby={`list-${slug(list.name)}`}>
              <h2 id={`list-${slug(list.name)}`}>{titleCase(list.name)}</h2>
              <p className="glossary-question">
                {list.question} <span className="muted">Stored in <code>{list.field}</code>.</span>
              </p>
              <div className="content-table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Plain name and stored value</th>
                      <th scope="col">What it means</th>
                      {counted && <th scope="col">In the catalog</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {list.values.map((v) => {
                      const n = counted ? catalog.uses(list.field, v.value) : 0;
                      return (
                        <tr key={v.value}>
                          <td className="glossary-name">
                            {list.vocabulary === 'Standing' && (RATING_SCALE as readonly string[]).includes(v.value) && <Meter value={v.value} />}
                            {v.name}
                            <code>{v.value}</code>
                          </td>
                          <td>{v.meaning}</td>
                          {counted && (
                            <td className="num">
                              {n ? `${n} ${perUse ? (n === 1 ? 'use' : 'uses') : n === 1 ? 'entry' : 'entries'}` : <span className="muted">none yet</span>}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </GuideShell>
      <FeedbackBand />
    </>
  );
}
