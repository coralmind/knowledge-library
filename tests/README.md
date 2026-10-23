# `tests/`

## Running

```bash
pixi run test        # fast suite; skips tests marked `slow`
pixi run test-all    # everything, including the slow real-catalog load
```

`pyproject.toml` (`[tool.pytest.ini_options]`) deselects the `slow` marker by
default. Without pixi, `pip install -e ".[dev]"` then `pytest` (or
`pytest -m ''` for all tests) does the same.

## Layout

```text
tests/coralmap/            unit tests, one module per module in src/coralmap/
tests/coralmap/models/     one module per module in src/coralmap/models/
tests/entries/             checks over the real entries/
tests/fixtures/kl/         a small synthetic library (ids kl-9xxxxx)
tests/fixtures/test_library.py   checks that the synthetic library is itself valid
tests/scripts/             tests for scripts/
```

A test module is named after the module it covers. A private module drops its
leading underscore: `src/coralmap/models/_derived.py` is tested in
`tests/coralmap/models/test_derived.py`. The `__init__.py` files keep pytest
from putting test directories on `sys.path`, where `tests/coralmap/` could
shadow the real `coralmap` package.

`tests/coralmap/conftest.py` provides three fixtures:

- `fixture_root`: the path to `tests/fixtures/kl/`.
- `mutable_root`: a copy of it in `tmp_path`, for tests that break an entry.
- `library`: the synthetic library, loaded.

## Conventions

Code tests run against the synthetic library, not real entries, so a revision
to an entry does not break a code test.

Tests in `tests/entries/` check the real catalog. A failure there means an
entry needs fixing, and the message should say which file and what is wrong.
Tests that load and validate the whole catalog are marked `slow`.
