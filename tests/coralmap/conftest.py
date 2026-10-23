"""Fixtures shared by the loader, query and validate suites."""

from __future__ import annotations

import pathlib
import shutil
from collections.abc import Iterator

import pytest

from coralmap import loader


@pytest.fixture(autouse=True)
def _clean_cache() -> Iterator[None]:
    """A load cache that survived between tests would make them order-dependent."""
    loader.clear_cache()
    yield
    loader.clear_cache()


@pytest.fixture
def fixture_root() -> pathlib.Path:
    """The synthetic library shipped in tests/fixtures/kl."""
    return pathlib.Path(__file__).parent.parent / "fixtures" / "kl"


@pytest.fixture
def mutable_root(fixture_root: pathlib.Path, tmp_path: pathlib.Path) -> pathlib.Path:
    """A writable copy, for tests that break an entry on purpose."""
    target = tmp_path / "kl"
    shutil.copytree(fixture_root, target)
    return target


@pytest.fixture
def library(fixture_root: pathlib.Path) -> loader.KnowledgeLibrary:
    """The synthetic library, loaded."""
    return loader.load(fixture_root)
