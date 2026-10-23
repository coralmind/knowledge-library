/**
 * The band above the footer on every page, asking readers to report what is
 * wrong. On an entry page its links carry the entry, so a report arrives
 * already pointing at it. Rights requests and identifying details are routed to
 * their private addresses instead. Every page renders exactly one.
 */
const CONTACT = 'https://coralmind.org/get-involved?sourceId=KnowledgeLibraryViewer&involve=other';

export function FeedbackBand({
  entry,
  version,
  digest,
}: {
  entry?: { id: string; display_id: string; label: string };
  version?: string | null;
  digest?: string;
}) {
  const named = entry ? `${entry.display_id} (${entry.id})` : null;
  const contact = named ? `${CONTACT}&entry=${encodeURIComponent(named)}#connect` : `${CONTACT}#connect`;
  const subject = named ? `Knowledge Library feedback: ${named}` : 'Knowledge Library feedback';
  const body = named
    ? `Entry: ${named}\n${entry?.label}\nLibrary version ${version ?? 'unknown'}, digest ${digest?.slice(0, 12) ?? 'unknown'}\n\nWhat is wrong, or what would you change?\n\n`
    : '';
  const mail = `mailto:hello@coralmind.org?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
  const rights = `mailto:compliance@coralmind.org?subject=${encodeURIComponent(named ? `Cited work: ${named}` : 'Cited work')}`;
  const identifying = `mailto:security@coralmind.org?subject=${encodeURIComponent(named ? `Identifying detail: ${named}` : 'Identifying detail')}`;

  return (
    <section className="feedback-band" id="feedback" aria-labelledby="feedback-heading">
      <div className="feedback-band__inner">
        <div>
          <h2 id="feedback-heading">See Something Wrong, or Have a Comment?</h2>
          <p>
            Tell us if an entry is unclear, a boundary doesn&rsquo;t hold, or evidence is missing or misstated. We
            review every report and reply, and record each change in the changelog.
          </p>
          <p>
            If you hold rights in a quoted passage, email <a href={rights}>compliance@coralmind.org</a>. If a detail
            could identify someone, email <a href={identifying}>security@coralmind.org</a> instead of using the form.
          </p>
        </div>
        <div className="feedback-band__actions">
          <a className="cm-btn" href={contact} target="_blank" rel="noopener noreferrer">Contact us</a>
          <a href={mail}>or email hello@coralmind.org</a>
        </div>
      </div>
    </section>
  );
}
