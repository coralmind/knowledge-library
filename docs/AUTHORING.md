# Authoring entries

**Owner:** CoralMind. These guidelines are part of the catalog and are licensed under [CC BY-NC 4.0](../CONTENT_LICENSE.md).

CoralMind writes the entries. Its [Psychological Expert Council](https://coralmind.org/about) informs the library's structure and tests it against contested cases. Entries change only at catalog releases, and [`../entries/CHANGELOG.md`](../entries/CHANGELOG.md) records what each release changed.

Do not edit files in `entries/` directly. Propose a change instead, as described below.

## Proposing a change to an entry

Open a [content report](https://github.com/coralmind/knowledge-library/issues/new/choose), or, if you do not use GitHub, use the [contact form on our website](https://coralmind.org/get-involved?sourceId=GitHub&involve=expertise#connect). Name the entry by its display id (`Pathway-5`) or its `kl-` id, say what is wrong or missing, and cite the source that supports the change where there is one.

We consider each proposal against the evidence and the rest of the library, and decide whether to change the entry. Changes we make arrive with a catalog release.

## Understanding the catalog

- [`../entries/README.md`](../entries/README.md) describes the entry types, the file layout and what the code relies on; the changelog beside it gives the counts in each release.
- [`../schema/`](../schema/) holds one JSON Schema per entry type, generated from the models.
- [`models.md`](models.md) is a class diagram of those models and a short explanation of every field.
- `src/coralmap/models/` defines every field, with a description of what it means. `entry.contract_fields()` returns the fields marked `contract()`.
- `pixi run check-entries` checks that the YAML in `entries/` parses and is indented by 2 spaces; `load()` and `validate()` check everything else.

## What an entry asserts

Writing an entry records that a claim is **asserted**, with its standing. It does not establish that any AI system exhibits the behavior, nor that any harm occurred. That requires measurement, which is what the toolkit and the data repository are for.

So an entry is worded as a definition, not as a finding. "The model provides content-level reassurance that closes off uncertainty" is a behavior definition. "Models routinely close off uncertainty" is a claim this library cannot support and should not contain.
