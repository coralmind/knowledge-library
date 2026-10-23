# Tutorial notebooks

Walk through `coralmap` against the library in this checkout.

```bash
pixi run lab
```

That opens JupyterLab on this directory. The dev environment installs
JupyterLab, ipykernel, and the package itself (editable), so `import coralmap`
resolves to `src/coralmap/`. The same environment is the kernel for these
notebooks.

Save each code cell with empty output: `outputs` is `[]` and `execution_count`
is `null`. The `clear-notebook-outputs` pre-commit hook strips saved outputs
when you commit a notebook. `pixi run check` fails if one still has output.

```bash
pixi run notebooks-clear   # strip outputs now, without a commit
pixi run notebooks         # check, then execute every cell; CI runs this
```

`pixi run notebooks` leaves the files unchanged. It is its own CI job because
each notebook loads the full catalog.

| Notebook | What it covers |
|---|---|
| [01_loading_the_library.ipynb](01_loading_the_library.ipynb) | `load()`, version, digest, `parse_problems()` |
| [02_querying_and_traversal.ipynb](02_querying_and_traversal.ipynb) | collections, filters, pathway views |
| [03_models_contract_validation.ipynb](03_models_contract_validation.ipynb) | models, `contract()`, `edges()`, `validate()`, sources |
