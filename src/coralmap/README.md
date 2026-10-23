# `src/coralmap/`

The loader, query and validation API for the Knowledge Library.

## Modules

| Module | Responsibility |
|---|---|
| `__init__.py` | Public surface: `load()`, the models, the collections |
| `models/` | The entry schema: every entry type, `Source`, `edges()`, and the derived pathway views |
| `vocabularies.py` | The controlled vocabularies, each value carrying its own definition |
| `loader.py` | YAML to models, schema-validated and cached. Holds `KnowledgeLibrary` |
| `query.py` | Filters and edge traversal, including `pathways.leading_to()` |
| `validate.py` | Cross-reference integrity across the whole graph |

`schema/` at the repository root is generated from `models/` by
`scripts/generate_json_schemas.py`.

## Edges are derived, not authored

No entry carries an `edges` list. Entries declare relationships in typed,
per-slot fields: a pathway has `composition_parts` and `impacts`, a user
behavior has `condition_tags`, every entry has `distinguish_from`.
`models.edges(entry)` flattens them for code that walks every relation, such
as `validate.py`.

Targets come out as authored: usually `kl-` ids, sometimes an alias.
`kl.entry()` resolves an id, display id or alias. An entry holds no reference
to the library it is in.

## Contract fields

A field declared with `contract()` in `models/` ships to consumers.
`entry.contract_fields()` returns those fields from a loaded entry, including
inside nested models.

```python
entry.contract_fields()             # marked fields, enum members
entry.contract_fields(mode="json")  # the same, ready to leave Python
```

## Invariants

- **Runtime dependencies are `pydantic` and `pyyaml` only.** CI fails if the set grows.
- **Every entry is validated on load.** There is no lenient mode; `parse_problems()` reports instead of raising.
- **Entries are immutable.** Models are frozen and sequence fields are tuples.
- **Undeclared public fields are rejected; `_`-prefixed ones are kept.** `public_fields()` strips the internal ones at every depth.
- **Entries hold ids, not object references.** Traversal goes through views in `query.py`, so entries stay serializable and the digest depends on content alone.
