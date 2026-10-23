# Pixi Environments

**Load when:** setting up the repo, running a command, or changing a dependency.

## Configuration

Pixi configuration is `[tool.pixi]` in `pyproject.toml`.

- Channels stay `conda-forge`.
- Platforms stay `osx-arm64`, `osx-64`, and `linux-64`.
- Environments are `default` (dev tools) and `viewer` (dev tools plus Node).
  JupyterLab is a conda package on `dev`, so notebooks run in `default` with
  `pixi run lab`.

`pixi task list` is the full task list. The commands this rule names are:

- `pixi run check` — the CI check job: lint, format, types, schema drift, entry
  indentation, empty notebook outputs, and tests. `pixi run notebooks` executes
  the tutorials and is its own CI job.
- `pixi run hooks-install` — install git hooks, once per clone
- `pixi run hooks` — run the hooks over the tree

## Commands

Development commands go through Pixi.

```bash
pixi install
pixi run <task>
```

Run `pixi install` before the first Pixi command in a fresh clone. It is safe
to run again.

`gh` is not a Pixi task. Call it directly.

## Dependencies

The published package installs with pip, and CI tests that path. Pip does not
need Pixi. Runtime dependencies stay `pydantic` and `pyyaml`. Ask before adding
a runtime dependency.

Add a development dependency in both `[project.optional-dependencies].dev` and
`[dependency-groups].dev`, then lock it with Pixi. Commit `pixi.lock` when
dependencies change. Do not hand-edit the lockfile.
