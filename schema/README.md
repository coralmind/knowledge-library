# `schema/`

JSON Schema files generated from the Pydantic models in `src/coralmap/models/`. Edit a model, then regenerate. Do not hand-edit files in this directory.

```bash
pixi run generate-json-schemas   # write schema/
pixi run check-json-schemas      # fail if schema/ is out of date
```

`check-json-schemas` is one of the tasks `pixi run check` runs, so CI fails a pull request when the schemas have drifted from the models.

To change a schema:

1. Edit the model in `src/coralmap/models/`.
2. Run `pixi run generate-json-schemas`.
3. Commit the model change and the regenerated schema together.
