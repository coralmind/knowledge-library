"""Structural checks on the files under ``entries/``.

Each file is named after the entry it holds and points an editor at the right
schema. Schema conformance is checked by the models, not here. Each check reads
a filename or a first line, and reports every offending file.
"""

from __future__ import annotations

from pathlib import Path

from coralmap.models import ENTRY_MODELS
from coralmap.vocabularies import EntryType

REPO = Path(__file__).resolve().parents[2]
ENTRIES = REPO / "entries"
SCHEMA = REPO / "schema"
DIRECTIVE = "# yaml-language-server: $schema="

#: Directory name to the entry type it holds. The directory is plural and the
#: type is singular, and ``person_context`` is neither, so the mapping is
#: written out rather than guessed from the name.
DIRECTORIES: dict[str, EntryType] = {
    "ai_behaviors": EntryType.ai_behavior,
    "user_behaviors": EntryType.user_behavior,
    "pathways": EntryType.pathway,
    "impacts": EntryType.impact,
    "mechanisms": EntryType.mechanism,
    "person_context": EntryType.context,
    "experience_clusters": EntryType.experience_cluster,
    "operator_actions": EntryType.operator_action,
    "context_dimensions": EntryType.context_dimension,
    "context_values": EntryType.context_value,
    "contrasts": EntryType.contrast,
    "divergences": EntryType.divergence,
}

#: The catalog directory of sources. ``type: source``, not an :class:`EntryType`,
#: so it is not in :data:`DIRECTORIES` and ``load()`` does not walk it.
SOURCE_DIR = "sources"

CATALOG_DIRECTORIES = frozenset(DIRECTORIES) | {SOURCE_DIR}

ENTRY_FILES = sorted(path for path in ENTRIES.rglob("*.yaml") if path.parent.name in DIRECTORIES)
SOURCE_FILES = sorted((ENTRIES / SOURCE_DIR).glob("*.yaml"))
CATALOG_FILES = sorted(ENTRY_FILES + SOURCE_FILES)


def _schema_name(path: Path) -> str:
    if path.parent.name == SOURCE_DIR:
        return "source"
    return DIRECTORIES[path.parent.name].value


def _is_source_id(name: str) -> bool:
    return name.startswith("kl-") and len(name) == len("kl-000000")


def _named(paths: list[Path], limit: int = 10) -> str:
    shown = ", ".join(str(p.relative_to(ENTRIES)) for p in paths[:limit])
    return f"{len(paths)} file(s): {shown}" + (", ..." if len(paths) > limit else "")


def test_every_entry_type_has_a_directory() -> None:
    assert set(DIRECTORIES.values()) == set(ENTRY_MODELS)


def test_entries_are_present_and_in_known_directories() -> None:
    assert len(ENTRY_FILES) == 431
    assert len(SOURCE_FILES) == 415
    stray = [p for p in ENTRIES.rglob("*.yaml") if p.parent.name not in CATALOG_DIRECTORIES]
    assert not stray, f"outside any catalog directory -- {_named(stray)}"


def test_every_file_is_named_after_its_id() -> None:
    malformed = [
        p for p in ENTRY_FILES if not p.stem.startswith("kl-") or len(p.stem) != len("kl-000000")
    ]
    assert not malformed, f"filename is not a kl- id -- {_named(malformed)}"
    bad_sources = [p for p in SOURCE_FILES if not _is_source_id(p.stem)]
    assert not bad_sources, f"source filename is not a kl- id -- {_named(bad_sources)}"


def test_ids_are_unique_across_directories() -> None:
    seen: dict[str, Path] = {}
    clashes = []
    for path in CATALOG_FILES:
        if path.stem in seen:
            clashes.append(f"{path.stem} in {seen[path.stem].parent.name} and {path.parent.name}")
        seen[path.stem] = path
    assert not clashes, f"duplicate ids: {clashes}"


def test_every_file_points_an_editor_at_its_schema() -> None:
    """The directive is a YAML comment, so a tool that re-emits a file drops it."""
    missing, wrong = [], []
    for path in CATALOG_FILES:
        first = path.read_text(encoding="utf-8").split("\n", 1)[0]
        if not first.startswith(DIRECTIVE):
            missing.append(path)
            continue
        expected = _schema_name(path)
        if first.removeprefix(DIRECTIVE) != f"../../schema/{expected}.schema.json":
            wrong.append(path)
    assert not missing, f"no schema directive -- {_named(missing)}"
    assert not wrong, f"schema directive points at the wrong schema -- {_named(wrong)}"


def test_every_referenced_schema_exists() -> None:
    needed = [f"{kind.value}.schema.json" for kind in DIRECTORIES.values()]
    needed.append("source.schema.json")
    absent = [name for name in needed if not (SCHEMA / name).exists()]
    assert not absent, f"entries/ directories whose schema is missing: {absent}"
