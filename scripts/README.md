# `scripts/`

Utilities for working on the repository. Nothing here is part of the public
API or imported by `coralmap`.

| Script | What it does | Run by |
|---|---|---|
| `generate_json_schemas.py` | Generates `schema/` from the Pydantic models in `src/coralmap/models/`. `--check` fails on drift | Contributors after a model change; CI on every push |
| `library_report.py` | Prints every parse and graph problem in the library | By hand, while authoring |
| `check_notebooks.py` | Fails when a tutorial notebook has saved output, clears that output, or executes every cell | Pre-commit hook `clear-notebook-outputs`; `pixi run check` fails if output remains; CI executes the notebooks |

---

## `generate_json_schemas.py`

```bash
pixi run generate-json-schemas   # write schema/
pixi run check-json-schemas      # exit non-zero if schema/ is out of date
```

Writes one `<type>.schema.json` per entry type into `schema/`, plus
`source.schema.json`, from the models in `src/coralmap/models/`. Run it after
changing a model. `pixi run check` includes `check-json-schemas`, so CI fails
when `schema/` is stale or a schema file is missing.

A stale schema does not necessarily fail anything on its own: it can accept a
field the loader rejects, and editors that validate entries against `schema/`
would show the wrong result.

## `library_report.py`

```bash
pixi run library-report
pixi run library-report --path some/other/library
```

Lists every entry that fails to parse, then, if all entries parse, every
graph problem `validate()` finds.

---

## `check_notebooks.py`

```bash
pixi run check-notebooks   # fail if a notebook has saved output
pixi run notebooks-clear   # remove saved outputs
pixi run notebooks         # check, then execute every cell
```

A code cell counts as empty when `outputs` is `[]` and `execution_count` is
`null`. The `clear-notebook-outputs` hook runs `--clear` on the notebooks in
a commit and rewrites them with the same JSON settings Jupyter uses, so
clearing does not reformat the file. `--check` and `--clear` use the standard
library. Execution imports `nbclient` from the pixi dev environment and leaves
the files unchanged.

---

## Conventions

Scripts other than notebook execution use only the standard library and the
package's runtime dependencies. `check_notebooks.py --check` and `--clear`
follow that. Executing the notebooks imports `nbclient`, which JupyterLab
already installs into the pixi dev environment.

Every script has a pixi task, which is the documented way to run it. The
scripts are still plain executables that exit non-zero on failure, so
`python scripts/generate_json_schemas.py --check` works outside pixi.
