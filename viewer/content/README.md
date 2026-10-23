# Viewer content

The words on the viewer's introduction and guide pages. Edit these files to change what a page says; the layout and styles live in `src/`, and nothing here needs a component change.

| File | Page |
| --- | --- |
| `introduction.md` | The home page, `/` |
| `guide/how-the-library-works.md` | `/guide` |
| `guide/evaluation.md` | `/guide/evaluation` |
| `guide/reference.md` | `/guide/reference` |
| `glossary.yaml` | `/guide/glossary`, and the plain name of every stored value shown anywhere on the site |
| `explore.yaml` | The words on `/explore`: its title, the starter questions and the entry each opens from (by permanent id), and the map's heading |
| `figures/` | Diagrams, inlined into the page |

These files are the only source of that text; the site is where it is read. To see an edit, run the viewer (`pixi run -e viewer viewer-dev`) and reload the page.

## Numbers come from the catalog

Never type a number that describes the catalog. Write a token, and the page counts it when the site is built:

| Token | Becomes |
| --- | --- |
| `{{entries(pathway)}}` | Current pathways. Any entry type works; `*` means every kind except sources |
| `{{field(pathway, counterpart_owed)}}` | Current pathways with that field filled in |
| `{{uses(standing.value, theorized)}}` | How often a stored value occurs at a glossary field path |
| `{{share(standing.value, plausible_unobserved)}}` | That count as a share of entries other than sources, as a phrase such as "more than half" |
| `{{into(kl-000015)}}` | Pathways that lead to an impact |
| `{{candidates(kl-000200)}}` | Pathways a behavior is a part of |
| `{{rated(theorized, kl-000055, kl-000084)}}` | How many of the named entries carry that rating |
| `{{pathways.with_condition}}` | A named fact; the full list is in `src/lib/catalog.ts` |

Add `|word` for a lowercase word up to twenty ("fifteen"), `|Word` to start a sentence ("Fifteen"), `|about` after "about" or "roughly" to round, or `|noun:pathway` to write the noun after the number in the singular or plural ("1 pathway", "9 pathways"). Modifiers combine: `|Word|noun:entry`. Retired entries are never counted. An unknown token fails the build, and every counted number shows what it counts when a reader hovers over it.

Numbers that are not about the catalog, such as the Toolkit's launch figures or "four ways the AI might respond", are ordinary text.

## Naming an entry

Write `[[kl-000067]]` to link an entry by its current label, or `[[kl-000067|other words]]` to choose the link text. Use the permanent `kl-` id, never a display id such as `Pathway-29`, which can change. An unknown id fails the build.

## Layout blocks

A few blocks say what a stretch of content is. They open with `:::name` and close with `:::` on its own line, and they can nest.

| Block | Used for |
| --- | --- |
| `:::note From the library` | A labelled aside. The label is the rest of the opening line |
| `:::values Standing scale` | A glossary list as a table. `scale` keeps the six-step evidence ratings; `count=PATH` adds how often each occurs |
| `:::pipeline` | A table of Stage, "N. Step" and output, drawn as the stage diagram. Each step links to the heading `### Step N.` |
| `:::cards` | Cards, from a table (first cell is the title) or from `###` sections. `numbered`, `doors` and `products` are variants; `from=HEADING-ID` takes the table under that heading in the guide |
| `:::hero`, `:::stats`, `:::actions`, `:::step N`, `:::aside`, `:::start` | The home page's sections. `:::step N` takes its heading and opening paragraph (`paragraphs=2` for two) from the guide's `## Step N.` |
| `:::transcript`, `:::criteria ID`, `:::chips VOCABULARY`, `:::pathway-graph ID`, `:::impact-domains`, `:::rating-ladder`, `:::from-guide HEADING-ID` | Home page figures built from the catalog and the glossary |
| `:::type-key` | A key to the colored dots that mark each kind of entry. The text inside is the key's lead-in |

A heading written `## Step 2. Name` is a numbered step: it gets the id `step-2` and its number as an eyebrow or badge. Any other heading's id is its text in lowercase with hyphens, or set one with `## Heading {#id}`.

## Writing

One line per paragraph; do not hard-wrap. No em dashes in prose and no bold inside paragraphs. Lead with an entry's label and leave its id to the link. Headings are written in sentence case; the site sets them in title case.
