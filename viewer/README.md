# Knowledge Library Viewer

The viewer is the website for reading the CoralMind Knowledge Library. With it you can:

- **Learn how the library works.** The introduction walks through the library in five steps. The guide explains how the library works, what every field means, how an evaluation uses the library, and the terms it uses.
- **Browse the catalog.** Look at one kind of entry at a time, narrow it by evidence rating, status, and other fields, and search labels, ids, definitions, claims, evidence quotes, and source details. Each row shows the entry's evidence rating and how many claims, pieces of evidence, and links it has. Every view has its own link, so you can share exactly what you see.
- **Search from any page.** The search box in the header shows matches by kind as you type. Press Enter on one to open it, or without choosing one to see them all in the catalog.
- **Read an entry in full.** An entry page shows the definition and evidence rating; how the entry connects to others, as a graph and as lists; each claim with its evidence, with the claim that sets the rating marked; the entries it is told apart from; and its other fields. A source page shows every entry and claim that cites it.
- **Trace how a conversation leads to an impact.** Explore starts from a question or from a map of pathways by AI behavior group and area of life. From any entry or map cell, it follows behaviors and context through the pathways they form to the impacts those lead to, filtered by direction, onset, timing, and evidence rating. Hover to trace a chain; click a node to explore from it.
- **Cite what you saw.** Each entry page has a Cite button that copies a citation with the library version and content digest, and each guide page says which version and digest its numbers were counted from.
- **Tell us what is wrong.** Every page ends with a way to report a problem. On an entry page, the report already names the entry.

The viewer is built directly from the entries in `../entries` and keeps no copy of the data.

## For Developers

The viewer is a Next.js app.

Pages:

- **Introduction** (`src/app/page.tsx`): the library in five steps, from
  `content/introduction.md`.
- **Catalog** (`src/app/catalog/page.tsx`): one kind of entry at a time in
  compact rows of 50, with a rail of kinds and their groups (an impact's area
  of life, a pathway's cluster, a behavior's conversation span), filters for
  evidence rating, status and type-specific fields, and a search over labels,
  ids, definitions, claims, evidence quotes and source details. Every row
  shows the evidence rating and its counts of claims, evidence and links. All
  state is in the URL and resolved on the server, so every view is linkable;
  a filter applies as soon as it changes, and on narrow screens the rail opens
  as a drawer.
- **Search** (`src/components/SearchBox.tsx`, `src/app/api/search/route.ts`):
  the header's search box shows results by kind as you type, from the same
  public rows the catalog reads; Enter opens all results in the catalog.
- **Entry** (`src/app/entry/[id]/page.tsx`), prerendered for every entry: the
  definition and evidence rating; how the entry connects, as a graph of its
  direct neighbors and as lists by relation; its claims, each with its
  evidence and the claim that sets the rating marked; the entries it is told
  apart from; and its remaining fields. A source page shows every entry and
  claim that cites it.
- **Guide** (`src/app/guide/`): how the library works, a reference to every
  field, how an evaluation uses the library, and the glossary, from
  `content/guide/` and `content/glossary.yaml`.
- **Explore** (`src/app/explore/page.tsx`): starter questions and a map of
  pathways by AI behavior group and area of life; from any entry or map cell,
  the behaviors and context gates, the pathways they form and the impacts
  those lead to, as a graph and a list, filtered by direction, onset, how
  soon and evidence rating. Hovering traces a chain; clicking pins a node to
  explore from it. The questions are in `content/explore.yaml`.

## Prerequisites

- Node 22 (22.12 or later). The pixi `viewer` environment provides it.
- Access to `@coralmind/brand`. The design tokens, base styles and logo come
  from this package, which is currently a **private** git dependency
  (`git+ssh://git@github.com/coralmind/brand.git`). Installing and building
  the viewer requires read access to that repository; locally an SSH key with
  access is enough. The dependency is pinned to a commit on the brand's `main`
  (`73e228e`, the website design edits) because no release includes them yet;
  change the pin to the `v0.2.0` tag once it is cut.

## Running

With pixi, from the repository root:

```bash
pixi run -e viewer viewer-dev     # dev server at http://localhost:3000
pixi run -e viewer viewer-build   # ingest, next build, then the leak checks
pixi run -e viewer viewer-test    # vitest
pixi run -e viewer viewer-check   # ingest, next typegen, tsc --noEmit
```

Each task runs `npm ci` in `viewer/` first.

With npm, from `viewer/`:

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # ingest, next build, then the leak checks (what CI runs)
npm run start      # serve a production build
npm run check      # ingest, next typegen, tsc --noEmit
npm test           # vitest
npm run ingest     # regenerate src/generated/ on its own
```

`dev`, `build` and `check` all run the ingest first, so there is no separate
setup step and no Python is needed.

Next 16 builds with Turbopack by default. Do not pass `--webpack`: webpack
rewrites the brand stylesheet's `@import ... layer(...)` rules into invalid
CSS, and the site renders unstyled with no build error.

## How Ingest Works

`scripts/ingest.ts` reads every YAML file under `../entries`, validates it with
Ajv against the JSON Schemas in `../schema`, and writes JSON into
`src/generated/`:

- `index.public.json`: one row per entry, for counts and labels
- `browse.public.json`: the catalog's rows, built from the redacted bodies,
  with link counts and the text the search reads
- `graph.public.json`: every link between entries, built from the redacted
  bodies, and the links whose target is not in the library
- `meta.json`: version, digest, counts, and any quarantined paths
- `entry/<id>.public.json` and `entry/<id>.private.json`: each entry body

`src/generated/` is gitignored, so a page can only be built from freshly
ingested entries. `KL_ENTRIES_DIR` and `KL_SCHEMA_DIR` override the source
paths (resolved in `src/lib/source.ts`). Ingest refuses to write its default
output anywhere but inside this package.

A schema violation fails the build. An entry that fails for a reason the
viewer cannot resolve may be listed, with a reason, in `src/lib/quarantine.ts`;
every ingest prints that list, and the build fails when a listed file starts
passing or no longer exists. The list is currently empty.

### Internal Fields

Any key beginning with `_`, at any depth, is internal (for example `_note` or
`_internal`). Ingest writes each entry twice: the `.public.json` file has every
`_`-prefixed key removed (`src/lib/redact.ts`), and the `.private.json` file
keeps the full body. Public pages read only the redacted file, so an internal
field is absent from everything they read. Nothing reads the private tier yet.

`src/lib/artifacts.ts` is the only module that reads `src/generated/`.

## Leak Checks

The tests run with `npm test`; the two scripts are the last steps of
`npm run build`, and either one failing fails the build.

- `tests/redact.test.ts` and `tests/ingest.test.ts`: public artifacts contain
  no internal keys.
- `tests/boundary.test.ts`: nothing under `src/app/` or `src/components/`
  calls `loadPrivateEntry`, no module but `src/lib/artifacts.ts` reaches into
  `src/generated/`, nothing imports from it, and the set of dynamic routes is
  pinned. Dynamic routes produce no build-time output for the scanner below.
- `scripts/assert-no-private-tracing.ts` (after `next build`): fails if any
  `.nft.json` trace manifest includes a `*.private.json` file. The tracing
  rules it guards are in `next.config.ts`; read the comment there before
  adding an `outputFileTracingIncludes` entry.
- `scripts/assert-no-internal-fields.ts` (after `next build`): scans
  prerendered HTML, RSC payloads and client chunks for every internal key
  name found in the private artifacts.

CI (`.github/workflows/viewer.yml`) runs the tests and the build, then also
fails if any JSON is committed under `viewer/` other than `package.json`,
`package-lock.json`, `tsconfig.json` and `vercel.json`, or if any tracked file
under `viewer/src/` is larger than 64 KB.

## Content

The words on the introduction and guide pages live in `content/`, apart from
the components and styles; `content/README.md` is the guide to editing them.
Two rules make the pages trustworthy:

- A number about the catalog is a token such as `{{pathways.with_condition}}`,
  counted from the ingested public entries when the page builds
  (`src/lib/catalog.ts`, `src/lib/content/tokens.ts`).
- An entry is named by `[[kl-000067]]` and shown with its current label.

An unknown token or id fails the build. The pages are the only rendering of this
content; there is no copy under `docs/`. `content/glossary.yaml` is the single source of plain names for stored values;
`tests/content.test.ts` fails when a schema value has none.

## Styling

Vanilla CSS with custom properties, no Tailwind. `src/app/layout.tsx` imports
`@coralmind/brand/styles/index.css`. `src/styles/app-tokens.css` maps entry
types to the brand's colors; `src/styles/shell.css` styles the header, feedback
band, footer and shared parts; `src/styles/content.css` the guide pages;
`src/styles/home.css` the introduction; `src/styles/catalog.css` the catalog;
`src/styles/entry.css` the entry and source pages; `src/styles/explore.css`
Explore; and `src/app/site.css` the entry-type colors. Viewer CSS is deliberately unlayered so it overrides the brand's
cascade layers without `!important`.

## Deployment

CI builds but does not deploy. `vercel.json` configures a Vercel build; the
project needs:

- **Root Directory:** `viewer`. Source paths resolve from the working
  directory's parent.
- **Include files outside the root directory in the Build Step:** enabled,
  because ingest reads `../entries` and `../schema`.

The site sends `X-Robots-Tag: noindex, nofollow` on every route.

## Layout

```text
viewer/
├── next.config.ts                    ·  tracing rules that keep the private tier out of bundles
├── package.json  tsconfig.json  vercel.json  vitest.config.ts
├── content/                          ·  page text: introduction, guide, glossary (see content/README.md)
├── public/robots.txt
├── scripts/
│   ├── ingest.ts                     ·  entries/ → src/generated/
│   ├── assert-no-private-tracing.ts  ·  post-build trace manifest check
│   └── assert-no-internal-fields.ts  ·  post-build scan of served output
├── src/
│   ├── app/                          ·  introduction, catalog, entry page, explore, guide, layout, icons
│   ├── components/                   ·  site frame, catalog and entry parts, PathwayGraph;
│   │                                    content/ renders content files
│   ├── lib/                          ·  artifacts, catalog counts, glossary, content/ (Markdown,
│   │                                    tokens), browse, explore, links, relations, search, parse, quarantine,
│   │                                    redact, source, types
│   ├── generated/                    ·  gitignored; written by ingest
│   └── styles/                       ·  app-tokens, shell, content, home, catalog, entry, explore
└── tests/                            ·  vitest suite
```

Ignore rules for this directory live in the repository-root `.gitignore`.
