"""Checks that the synthetic fixture library in ``tests/fixtures/kl`` is itself valid."""

import pathlib

import pytest
import yaml

from coralmap.models import ENTRY_MODELS
from coralmap.vocabularies import EntryType

DIRECTORIES: dict[str, EntryType] = {
    "ai_behaviors": EntryType.ai_behavior,
    "user_behaviors": EntryType.user_behavior,
    "pathways": EntryType.pathway,
    "impacts": EntryType.impact,
    "mechanisms": EntryType.mechanism,
    "context_dimensions": EntryType.context_dimension,
    "context_values": EntryType.context_value,
    "experience_clusters": EntryType.experience_cluster,
    "operator_actions": EntryType.operator_action,
}

FIXTURE = pathlib.Path(__file__).parent / "kl"


def _files() -> list[tuple[str, pathlib.Path]]:
    return [
        (name, path)
        for name in DIRECTORIES
        for path in sorted((FIXTURE / "entries" / name).glob("*.yaml"))
    ]


def test_every_entry_type_is_represented() -> None:
    present = {name for name, _ in _files()}
    assert present == set(DIRECTORIES), f"missing: {sorted(set(DIRECTORIES) - present)}"


@pytest.mark.parametrize(("directory", "path"), _files(), ids=lambda v: getattr(v, "name", v))
def test_fixture_entry_parses(directory: str, path: pathlib.Path) -> None:
    model = ENTRY_MODELS[DIRECTORIES[directory]]
    model.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")))


def test_fixture_ids_cannot_collide_with_real_entries() -> None:
    for _, path in _files():
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert raw["id"].startswith("kl-9"), f"{path.name} must use the kl-9xxxxx test range"
