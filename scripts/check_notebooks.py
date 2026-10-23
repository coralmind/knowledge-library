#!/usr/bin/env python3
"""Check, clear, or execute the tutorial notebooks in ``notebooks/``.

Usage::

    pixi run check-notebooks   # fail if a notebook has saved output
    pixi run notebooks-clear   # remove saved outputs
    pixi run notebooks         # check, then execute every cell

The ``clear-notebook-outputs`` pre-commit hook runs ``--clear`` on the
notebooks included in a commit. A code cell is empty when ``outputs`` is
``[]`` and ``execution_count`` is ``null``. Execution runs in memory and
leaves the files unchanged.

``--check`` and ``--clear`` use only the standard library. Executing imports
``nbclient``, which the pixi dev environment already has through JupyterLab.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("check_notebooks")

REPO_ROOT = Path(__file__).resolve().parent.parent
NOTEBOOK_DIR = REPO_ROOT / "notebooks"

# One cell loads the catalog; leave room for a cold kernel on CI.
CELL_TIMEOUT_SECONDS = 120


def notebook_paths() -> list[Path]:
    return sorted(NOTEBOOK_DIR.glob("*.ipynb"))


def resolve_notebooks(requested: list[Path]) -> tuple[list[Path], list[str]]:
    """Notebooks to clear. An empty request means every tutorial notebook."""
    if not requested:
        return notebook_paths(), []

    root = NOTEBOOK_DIR.resolve()
    selected: list[Path] = []
    problems: list[str] = []
    for path in requested:
        resolved = path.resolve()
        if resolved.suffix != ".ipynb" or not resolved.is_relative_to(root):
            problems.append(f"{path} is not a notebook under {_display(NOTEBOOK_DIR)}")
            continue
        selected.append(resolved)
    return selected, problems


def load_notebook(path: Path) -> dict[str, Any]:
    loaded = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(loaded, dict):
        raise ValueError(f"{_display(path)} is not a notebook object")
    return loaded


def dump_notebook(notebook: dict[str, Any]) -> str:
    """Serialize with the same JSON settings Jupyter uses, so a clear does not reformat."""
    return (
        json.dumps(
            notebook,
            indent=1,
            sort_keys=True,
            separators=(",", ": "),
            ensure_ascii=False,
        )
        + "\n"
    )


def write_notebook(path: Path, notebook: dict[str, Any]) -> None:
    path.write_text(dump_notebook(notebook), encoding="utf-8")


def saved_output_problems(path: Path, notebook: dict[str, Any]) -> list[str]:
    """Return one problem per code cell that has outputs or an execution count."""
    label = _display(path)
    cells = notebook.get("cells")
    if not isinstance(cells, list):
        return [f"{label} has no cells array"]

    problems = []
    for index, cell in enumerate(cells, start=1):
        if not isinstance(cell, dict) or cell.get("cell_type") != "code":
            continue
        if cell.get("execution_count") is not None:
            problems.append(f"{label}: cell {index} has an execution count")
        if cell.get("outputs"):
            problems.append(f"{label}: cell {index} has saved output")
    return problems


def clear_notebook(notebook: dict[str, Any]) -> bool:
    """Drop saved outputs and execution counts. Return whether anything changed."""
    cells = notebook.get("cells")
    if not isinstance(cells, list):
        return False

    changed = False
    for cell in cells:
        if not isinstance(cell, dict) or cell.get("cell_type") != "code":
            continue
        if cell.get("execution_count") is not None:
            cell["execution_count"] = None
            changed = True
        if cell.get("outputs"):
            cell["outputs"] = []
            changed = True
    return changed


def execute_notebook(path: Path, *, cwd: Path) -> None:
    """Run every cell. The notebook on disk is not written."""
    import nbformat
    from nbclient import NotebookClient
    from nbclient.exceptions import CellExecutionError, CellTimeoutError

    notebook = nbformat.read(path, as_version=4)
    client = NotebookClient(
        notebook,
        timeout=CELL_TIMEOUT_SECONDS,
        kernel_name="python3",
        resources={"metadata": {"path": str(cwd)}},
    )
    try:
        client.execute()
    except (CellExecutionError, CellTimeoutError) as error:
        raise RuntimeError(f"{_display(path)} failed:\n{error}") from error


def _display(path: Path) -> str:
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return str(path)


def main(argv: list[str] | None = None) -> int:
    description = __doc__.splitlines()[0] if __doc__ else None
    parser = argparse.ArgumentParser(description=description)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if a tutorial notebook has saved output.",
    )
    mode.add_argument(
        "--clear",
        action="store_true",
        help="Remove saved outputs and execution counts.",
    )
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        help="With --clear, only these notebooks. Defaults to every file in notebooks/.",
    )
    args = parser.parse_args(argv)
    if args.paths and not args.clear:
        parser.error("notebook paths are only accepted with --clear")

    logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)

    paths, problems = resolve_notebooks(args.paths)
    if problems:
        for problem in problems:
            logger.error("%s", problem)
        return 1
    if not paths:
        logger.error("no notebooks in %s", _display(NOTEBOOK_DIR))
        return 1

    if args.clear:
        cleared = 0
        for path in paths:
            notebook = load_notebook(path)
            if clear_notebook(notebook):
                write_notebook(path, notebook)
                logger.info("cleared %s", _display(path))
                cleared += 1
        if cleared:
            logger.info("cleared %d notebook(s).", cleared)
        else:
            logger.info("notebook outputs already empty (%d notebooks).", len(paths))
        return 0

    problems: list[str] = []
    for path in paths:
        problems.extend(saved_output_problems(path, load_notebook(path)))
    if problems:
        logger.error("tutorial notebooks must be saved with empty outputs:")
        for problem in problems:
            logger.error("  %s", problem)
        logger.error("The pre-commit hook clears these. Run: pixi run notebooks-clear")
        return 1

    if args.check:
        logger.info("notebook outputs are empty (%d notebooks).", len(paths))
        return 0

    for path in paths:
        logger.info("executing %s", _display(path))
        try:
            execute_notebook(path, cwd=REPO_ROOT)
        except RuntimeError as error:
            logger.error("%s", error)
            return 1
    logger.info("executed %d notebooks.", len(paths))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
