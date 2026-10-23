"""Tests for the tutorial-notebook output check and clear."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

import check_notebooks


def _notebook(*cells: dict[str, object]) -> dict[str, object]:
    return {
        "cells": list(cells),
        "metadata": {},
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def _code(
    source: str,
    *,
    execution_count: int | None = None,
    outputs: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    return {
        "cell_type": "code",
        "execution_count": execution_count,
        "id": "abc",
        "metadata": {},
        "outputs": [] if outputs is None else outputs,
        "source": [source],
    }


def _write(directory: Path, name: str, notebook: dict[str, object]) -> Path:
    path = directory / name
    path.write_text(check_notebooks.dump_notebook(notebook), encoding="utf-8")
    return path


def test_dump_uses_the_jupyter_notebook_json_format() -> None:
    text = check_notebooks.dump_notebook(_notebook())
    assert text == (
        '{\n "cells": [],\n "metadata": {},\n "nbformat": 4,\n "nbformat_minor": 5\n}\n'
    )


def test_saved_output_and_execution_count_are_problems(tmp_path: Path) -> None:
    path = tmp_path / "demo.ipynb"
    stream = {"output_type": "stream", "text": ["1\n"]}
    notebook = _notebook(
        {"cell_type": "markdown", "id": "md", "metadata": {}, "source": ["# Title\n"]},
        _code("print(1)\n", execution_count=1, outputs=[stream]),
    )
    problems = check_notebooks.saved_output_problems(path, notebook)
    assert problems == [
        f"{path}: cell 2 has an execution count",
        f"{path}: cell 2 has saved output",
    ]


def test_clear_drops_outputs_and_leaves_an_empty_notebook_alone() -> None:
    dirty = _notebook(_code("print(1)\n", execution_count=2, outputs=[{"output_type": "stream"}]))
    assert check_notebooks.clear_notebook(dirty)
    assert dirty["cells"][0]["outputs"] == []
    assert dirty["cells"][0]["execution_count"] is None
    assert not check_notebooks.clear_notebook(dirty)


def test_check_fails_without_executing_when_output_is_saved(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _write(
        tmp_path,
        "01.ipynb",
        _notebook(_code("print(1)\n", execution_count=1)),
    )
    monkeypatch.setattr(check_notebooks, "NOTEBOOK_DIR", tmp_path)
    executed: list[Path] = []
    monkeypatch.setattr(
        check_notebooks,
        "execute_notebook",
        lambda path, cwd: executed.append(path),
    )

    assert check_notebooks.main([]) == 1
    assert executed == []


def test_clear_can_target_one_notebook(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    kept = _write(tmp_path, "01.ipynb", _notebook(_code("print(1)\n", execution_count=1)))
    target = _write(tmp_path, "02.ipynb", _notebook(_code("print(2)\n", execution_count=4)))
    kept_before = kept.read_text(encoding="utf-8")
    monkeypatch.setattr(check_notebooks, "NOTEBOOK_DIR", tmp_path)

    assert check_notebooks.main(["--clear", str(target)]) == 0
    assert kept.read_text(encoding="utf-8") == kept_before
    cleared = json.loads(target.read_text(encoding="utf-8"))
    assert cleared["cells"][0]["execution_count"] is None


def test_clear_rejects_a_path_outside_notebooks(tmp_path: Path) -> None:
    outsider = tmp_path / "notes.ipynb"
    outsider.write_text("{}\n", encoding="utf-8")
    assert check_notebooks.main(["--clear", str(outsider)]) == 1
    assert outsider.read_text(encoding="utf-8") == "{}\n"


def test_clear_rewrites_only_notebooks_that_have_saved_output(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    empty = _write(tmp_path, "01.ipynb", _notebook(_code("print(1)\n")))
    dirty = _write(tmp_path, "02.ipynb", _notebook(_code("print(2)\n", execution_count=1)))
    before = empty.read_text(encoding="utf-8")
    monkeypatch.setattr(check_notebooks, "NOTEBOOK_DIR", tmp_path)

    assert check_notebooks.main(["--clear"]) == 0
    assert empty.read_text(encoding="utf-8") == before
    cleared = json.loads(dirty.read_text(encoding="utf-8"))
    assert cleared["cells"][0]["execution_count"] is None
    assert cleared["cells"][0]["outputs"] == []


def test_clean_notebooks_are_executed(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = _write(tmp_path, "01.ipynb", _notebook(_code("print(1)\n")))
    before = path.read_text(encoding="utf-8")
    monkeypatch.setattr(check_notebooks, "NOTEBOOK_DIR", tmp_path)
    executed: list[Path] = []
    monkeypatch.setattr(
        check_notebooks,
        "execute_notebook",
        lambda notebook_path, cwd: executed.append(notebook_path),
    )

    assert check_notebooks.main([]) == 0
    assert executed == [path]
    assert path.read_text(encoding="utf-8") == before


def test_committed_tutorial_notebooks_have_no_saved_output() -> None:
    problems: list[str] = []
    for path in sorted((check_notebooks.REPO_ROOT / "notebooks").glob("*.ipynb")):
        problems.extend(
            check_notebooks.saved_output_problems(path, check_notebooks.load_notebook(path))
        )
    assert problems == []
