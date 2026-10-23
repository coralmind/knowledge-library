"""The library under ``entries/``, loaded.

Marked slow. Every other loader test runs against the synthetic fixture in
``tests/fixtures/kl``.
"""

from __future__ import annotations

import pathlib

import pytest

from coralmap import loader

REPO = pathlib.Path(__file__).resolve().parents[2]

pytestmark = pytest.mark.slow


def test_entry_count_has_not_silently_changed() -> None:
    """Entry and source files together."""
    found = sorted((REPO / "entries").rglob("*.yaml"))
    assert len(found) == 846


def test_every_entry_parses() -> None:
    assert loader.parse_problems(REPO) == []


def test_real_library_loads_and_validates() -> None:
    kl = loader.load(REPO)
    assert kl.digest.startswith("sha256:")
    assert len(kl.pathways) == 117
    assert len(kl.behaviors) == 110
    assert len(kl.user_behaviors) == 109
    assert len(kl.impacts) == 28
    assert len(kl.all_entries()) == 431
    assert kl.validate() == []
