# `entries/`: the catalog

This directory is the Knowledge Library itself. It holds the pathways; the AI and user behaviors they are built from; the impacts they lead to; the context a test case is built along; the mechanisms and experience clusters around them; and the sources that citations name. Everything else in this repository exists to load, check, and show what is in here.

CoralMind writes the content, and its [Psychological Expert Council](https://coralmind.org/about) informs the library's structure and tests it against contested cases. The content is licensed under [CC BY-NC 4.0](../CONTENT_LICENSE.md).

[`CHANGELOG.md`](CHANGELOG.md) records each catalog release: what changed, why, and how many entries of each kind it holds. It is separate from the root [`../CHANGELOG.md`](../CHANGELOG.md), which tracks releases of the Python package.

## What Belongs Here

Only catalog records that a person wrote:

- a pathway: how an AI behavior contributes to an impact
- a behavior, defined precisely enough that a judge can tell whether a transcript contains it
- an impact on a person
- a context value a test case can record
- a source that a citation names

| Not this | Where it goes instead |
|---|---|
| Test cases, seeds, personas | `data-repository/` in `coralmind/toolkit` |
| Run output, transcripts, scores | `data-repository/` in `coralmind/toolkit` |
| Judge prompts | `coralmind/toolkit` |
| The JSON Schema files | `../schema/`, generated from the models |
| Anything a program produced | Nowhere in this repository |

The test is whether a person wrote it. Everything here is a claim someone decided to make. If a script could regenerate a file, it does not belong here.

## File Layout

One file per entry, grouped by type and named after the entry's `id`:

```text
entries/
├── ai_behaviors/
├── user_behaviors/
├── pathways/
├── impacts/
├── mechanisms/
├── experience_clusters/
├── operator_actions/
├── context_dimensions/
├── context_values/
├── person_context/
├── contrasts/
├── divergences/
├── sources/
└── CHANGELOG.md
```

`person_context/` holds only retired entries. They are kept so that anything that cites them can still find them. `divergences/` is empty for now; its README says what the type is for.

`sources/` holds one file per cited work. A source has a `kl-` id and a `Source-N` display id, like an entry, and records what a reader needs to know about the work: title, authors, year, venue, identifiers, study design, and a quality grade. A source is not an entry, though. It makes no claims, has no evidence rating, and is not included in `kl.all_entries()`. `load()` puts sources in their own collection, `kl.sources`, and `kl.source(id)` looks one up. Each piece of evidence (a `claim_evidence` row) names its source by id, and `kl.validate()` reports any id that does not match a source.

Files are named by `id` because an id never changes. Entries load in filename order, which is id order, so report tables and viewer listings come out in the same order every time.

Every file starts with a comment that points editors to its schema, so an editor can suggest fields and flag mistakes while you write:

```yaml
# yaml-language-server: $schema=../../schema/ai_behavior.schema.json
id: kl-000204
```

Because this line is a comment, a tool that reads and rewrites these files as YAML will drop it without warning. `tests/entries/test_files.py` fails if a file is missing the line or points to the wrong schema.

## What the code relies on

The code accepts any entry that matches its schema in `../schema/`. The schema is the only agreement between this directory and the code in `src/coralmap/`, which is why content can change without a code change.

| Field | Requirement | Why the code needs it |
|---|---|---|
| `id` | `kl-` and six digits; unique, never reused, never changed once published | Digests and cross-references key on it |
| `display_id` | Unique and human-facing, such as `Pathway-5` | Reports show it, and `kl.pathway("Pathway-5")` accepts it. It changes when a family of entries is renamed, with the old handle kept in `aliases`, so code that stores a reference stores the `id` |
| `type` | One of the entry types in `coralmap.vocabularies.EntryType` | Selects the validating model and the viewer's rendering |
| relationships | Declared in the typed fields each entry type has, with every target resolving | The library is a graph, and these fields are what make it one |

Entries have no single, generic list of links. Each kind of link has its own field: a pathway lists its `composition_parts` and `impacts`, a user behavior its `condition_tags`, and every entry its `distinguish_from`. These are different kinds of claim, so they are kept apart when written. For code that needs every link in one list, `coralmap.models.edges(entry)` combines them.

A pathway's parts are one list, `composition_parts`. Each part names a behavior or a context value, and its `role` says what that part does in the pathway. `observations(body)` returns the parts that make up what happened in the conversation, and `preconditions(body)` returns the parts that must be true of the test case for the pathway to apply. A pathway's overall direction (`sign`) and the stretch of conversation a judge must read (`detection_window`) are computed from its parts and impacts by functions of the same names. They are never stored.

### Contract Fields Are Promises

Fields declared with `contract()` in `src/coralmap/models/` are the ones code using the library can rely on, and `entry.contract_fields()` returns them. The evidence fields (`claims`, `claim_evidence`, `sources`, `standing`) are not contract fields. They record what the library's claims rest on, which a test case generator or judge does not need in order to run.

### Identifiers Are Permanent

Once an entry appears in a tagged release, its `id` never changes. Evaluation runs record entries by `id`, so changing one would silently break published work. To replace an entry, retire it (set its status to `deprecated`) and name its replacement in `lifecycle.superseded_by`. Never renumber.

Code that loads the library cannot change its entries. Entries change only through catalog releases.

## Schema and Reference Validation

Two checks make sure entries are well-formed and connected. Neither checks whether what an entry says is correct; that rests on its claims and their evidence.

**Schema validation, on load.** Each entry is checked against its schema, and any failure stops the load with an error. There is no lenient mode. A library that is only partly valid is worse than none, because code holding a loaded library will reasonably assume everything in it is sound.

**Reference validation, with `kl.validate()`.** This checks the links between entries across the whole library and returns every problem at once, as readable messages, so an author can see whether there is one typo or forty. The most important check is that every link points to an entry that exists, because a broken link fails silently. If a pathway's link to its impact is broken, nothing crashes: the pathway drops out of `pathways.leading_to()`, and so out of every rate computed from that set, while reports still render and the numbers still look plausible.
