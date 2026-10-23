#!/usr/bin/env python3
"""Generate ``schema/`` from the Pydantic models in ``coralmap.models``.

Usage::

    pixi run generate-json-schemas   # write schema/
    pixi run check-json-schemas      # exit non-zero if schema/ is out of date

``pixi run check`` runs ``check-json-schemas``.

One schema is written per entry type, named after its ``type`` value, plus
``source.schema.json``. Under ``--check``, a missing schema file is an error.
"""

from __future__ import annotations

import argparse
import json
import logging
from collections.abc import Mapping
from pathlib import Path
from typing import TYPE_CHECKING

from coralmap.models import ENTRY_MODELS, Source

if TYPE_CHECKING:
    from pydantic import BaseModel

logger = logging.getLogger("generate_json_schemas")

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = REPO_ROOT / "schema"

# Output filenames follow the entry ``type`` value.
REGISTRY: Mapping[str, type[BaseModel]] = {
    entry_type.value: model for entry_type, model in ENTRY_MODELS.items()
} | {"source": Source}


def render(model: type[BaseModel]) -> str:
    """Return the JSON Schema for ``model`` with sorted keys and a fixed indent."""
    schema = model.model_json_schema()
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


def target_path(type_name: str) -> Path:
    return SCHEMA_DIR / f"{type_name}.schema.json"


def _display(path: Path) -> str:
    """Repo-relative path for messages, or the path as given if outside the repo."""
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def write_all() -> list[Path]:
    """Write every schema; return the paths written."""
    SCHEMA_DIR.mkdir(parents=True, exist_ok=True)
    written = []
    for type_name, model in REGISTRY.items():
        path = target_path(type_name)
        path.write_text(render(model), encoding="utf-8")
        written.append(path)
    return written


def check_all() -> list[str]:
    """Return a human-readable problem per stale or missing schema."""
    problems = []
    for type_name, model in REGISTRY.items():
        path = target_path(type_name)
        expected = render(model)
        if not path.exists():
            problems.append(f"{_display(path)} is missing")
        elif path.read_text(encoding="utf-8") != expected:
            problems.append(f"{_display(path)} is out of date")
    return problems


def main(argv: list[str] | None = None) -> int:
    description = __doc__.splitlines()[0] if __doc__ else None
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if schema/ does not match the models, instead of writing.",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)

    if args.check:
        problems = check_all()
        if problems:
            logger.error("schema/ is out of date with coralmap.models:")
            for problem in problems:
                logger.error("  %s", problem)
            logger.error(
                "Run: pixi run generate-json-schemas\n"
                "Commit the model change and the regenerated schema together."
            )
            return 1
        logger.info("schema/ is up to date (%d schemas).", len(REGISTRY))
        return 0

    written = write_all()
    for path in written:
        logger.info("wrote %s", _display(path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
