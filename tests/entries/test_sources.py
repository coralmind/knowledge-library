"""Checks on ``entries/sources/``.

Each file is named after the source it holds, parses as :class:`Source`, and
points an editor at ``source.schema.json``.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from coralmap.models import Source

REPO = Path(__file__).resolve().parents[2]
SOURCES = REPO / "entries" / "sources"
SCHEMA = REPO / "schema"
DIRECTIVE = "# yaml-language-server: $schema="

SOURCE_FILES = sorted(SOURCES.glob("*.yaml"))


@pytest.fixture(scope="module")
def raw_sources() -> list[dict[str, object]]:
    return [yaml.safe_load(f.read_text(encoding="utf-8")) for f in SOURCE_FILES]


@pytest.fixture(scope="module")
def sources(raw_sources: list[dict[str, object]]) -> list[Source]:
    return [Source.model_validate(row) for row in raw_sources]


def test_every_record_parses(sources: list[Source]) -> None:
    assert len(sources) == 415


def test_ids_are_unique(sources: list[Source]) -> None:
    ids = [source.id for source in sources]
    assert len(ids) == len(set(ids))


def test_every_file_is_named_after_its_id(sources: list[Source]) -> None:
    mismatched = [
        f.name for f, source in zip(SOURCE_FILES, sources, strict=True) if f.stem != source.id
    ]
    assert not mismatched, f"filename does not match id: {mismatched[:10]}"


def test_every_file_points_an_editor_at_the_source_schema() -> None:
    reference = "../../schema/source.schema.json"
    missing, wrong = [], []
    for path in SOURCE_FILES:
        first = path.read_text(encoding="utf-8").split("\n", 1)[0]
        if not first.startswith(DIRECTIVE):
            missing.append(path.name)
        elif first.removeprefix(DIRECTIVE) != reference:
            wrong.append(path.name)
    assert not missing, f"no schema directive: {missing[:10]}"
    assert not wrong, f"directive points at the wrong schema: {wrong[:10]}"
    assert (SCHEMA / "source.schema.json").exists()


def test_type_and_layer_are_fixed(sources: list[Source]) -> None:
    stray = [
        source.id for source in sources if source.type != "source" or source.layer != "provenance"
    ]
    assert not stray


def test_every_external_source_records_a_license(sources: list[Source]) -> None:
    missing = [
        source.id
        for source in sources
        if not source.body.is_internal and source.body.license_status is None
    ]
    assert not missing, f"external source with no license_status: {missing[:10]}"
