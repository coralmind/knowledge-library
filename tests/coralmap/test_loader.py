"""Tests for ``load()`` and ``KnowledgeLibrary``, including the content digest."""

from __future__ import annotations

import pathlib

import pytest

import coralmap
from coralmap import loader
from coralmap.vocabularies import EntryType


def test_explicit_path_wins_over_env(
    fixture_root: pathlib.Path, monkeypatch: pytest.MonkeyPatch, tmp_path: pathlib.Path
) -> None:
    monkeypatch.setenv(loader.PATH_ENV_VAR, str(tmp_path))
    assert loader._resolve_source(fixture_root) == fixture_root


def test_env_var_used_when_no_argument(
    fixture_root: pathlib.Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(loader.PATH_ENV_VAR, str(fixture_root))
    assert loader._resolve_source(None) == fixture_root


def test_bundle_used_when_nothing_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv(loader.PATH_ENV_VAR, raising=False)
    resolved = loader._resolve_source(None)
    assert (resolved / "entries").is_dir()


def test_a_source_checkout_reads_its_own_entries(monkeypatch: pytest.MonkeyPatch) -> None:
    """Imported from src/, the package reads the checkout rather than an installed copy."""
    package = pathlib.Path(loader.__file__).resolve().parent
    if (package / loader.BUNDLE_DIR).is_dir():
        pytest.skip("running from an installed wheel")
    monkeypatch.delenv(loader.PATH_ENV_VAR, raising=False)
    assert loader._resolve_source(None) == package.parent.parent


def test_the_bundle_wins_over_the_checkout(
    monkeypatch: pytest.MonkeyPatch, tmp_path: pathlib.Path
) -> None:
    package = tmp_path / "src" / "coralmap"
    (package / loader.BUNDLE_DIR / "entries").mkdir(parents=True)
    (tmp_path / "entries").mkdir()
    monkeypatch.setattr(loader, "__file__", str(package / "loader.py"))
    assert loader._bundled_dir() == package / loader.BUNDLE_DIR


def test_directory_without_entries_is_an_error(tmp_path: pathlib.Path) -> None:
    with pytest.raises(FileNotFoundError, match="no entries/ directory"):
        loader._resolve_source(tmp_path)


def test_env_var_pointing_nowhere_is_an_error(
    monkeypatch: pytest.MonkeyPatch, tmp_path: pathlib.Path
) -> None:
    missing = tmp_path / "gone"
    monkeypatch.setenv(loader.PATH_ENV_VAR, str(missing))
    with pytest.raises(FileNotFoundError, match=loader.PATH_ENV_VAR):
        loader._resolve_source(None)


def test_fixture_library_parses_into_typed_entries(fixture_root: pathlib.Path) -> None:
    entries, _ = loader._load_entries(fixture_root)
    assert set(entries) == set(EntryType)
    assert len(entries[EntryType.pathway]) == 3
    assert len(entries[EntryType.ai_behavior]) == 2
    assert entries[EntryType.impact][0].display_id == "Impact-901"


def test_entries_keep_authored_order(fixture_root: pathlib.Path) -> None:
    pathways = loader._load_entries(fixture_root)[0][EntryType.pathway]
    assert [p.id for p in pathways] == ["kl-900101", "kl-900102", "kl-900103"]


def test_internal_underscore_keys_survive_parsing(fixture_root: pathlib.Path) -> None:
    behaviors = loader._load_entries(fixture_root)[0][EntryType.ai_behavior]
    first = next(b for b in behaviors if b.id == "kl-900001")
    assert (first.__pydantic_extra__ or {}).get("_note")


def test_every_failing_file_is_reported_not_just_the_first(
    mutable_root: pathlib.Path,
) -> None:
    for name in ("kl-900301.yaml",):
        path = mutable_root / "entries" / "impacts" / name
        path.write_text(path.read_text().replace("type: impact", "type: impact\nbogus: 1"))
    broken = mutable_root / "entries" / "mechanisms" / "kl-900401.yaml"
    broken.write_text(broken.read_text().replace("type: mechanism", "type: mechanism\nalso: 2"))

    with pytest.raises(loader.LibraryParseError) as caught:
        loader._load_entries(mutable_root)

    joined = "\n".join(caught.value.problems)
    assert "kl-900301.yaml" in joined
    assert "kl-900401.yaml" in joined
    assert len(caught.value.problems) >= 2


def test_parse_problems_returns_instead_of_raising(mutable_root: pathlib.Path) -> None:
    broken = mutable_root / "entries" / "impacts" / "kl-900301.yaml"
    broken.write_text(broken.read_text().replace("type: impact", "type: impact\nbogus: 1"))
    problems = loader.parse_problems(mutable_root)
    assert any("kl-900301.yaml" in p for p in problems)


def test_parse_problems_is_empty_for_a_clean_library(fixture_root: pathlib.Path) -> None:
    assert loader.parse_problems(fixture_root) == []


def test_load_returns_a_library(fixture_root: pathlib.Path) -> None:
    kl = loader.load(fixture_root)
    assert kl.version == coralmap.__version__


def test_accessors_find_entries_by_display_id(library: loader.KnowledgeLibrary) -> None:
    assert library.behavior("AiBehavior-901").id == "kl-900001"
    assert library.impact("Impact-901").id == "kl-900301"
    assert library.pathway("Pathway-901").entry.id == "kl-900101"


def test_entry_accepts_either_identifier(library: loader.KnowledgeLibrary) -> None:
    assert library.entry("kl-900401").display_id == "Mechanism-901"
    assert library.entry("Mechanism-901").id == "kl-900401"


def test_entry_resolves_an_alias(library: loader.KnowledgeLibrary) -> None:
    """Validation accepts an alias as an edge target, so lookup must resolve it too."""
    assert library.entry("ConditionTag-901").id == "kl-900601"


def test_an_alias_never_shadows_an_id_or_display_id(mutable_root: pathlib.Path) -> None:
    path = mutable_root / "entries" / "context_values" / "kl-900601.yaml"
    text = path.read_text(encoding="utf-8")
    path.write_text(
        text.replace("- ConditionTag-901\n", "- ConditionTag-901\n- Mechanism-901\n- kl-900401\n"),
        encoding="utf-8",
    )
    library = loader.load(mutable_root)
    assert library.entry("Mechanism-901").id == "kl-900401"
    assert library.entry("kl-900401").id == "kl-900401"


def test_missing_key_raises_keyerror(library: loader.KnowledgeLibrary) -> None:
    with pytest.raises(KeyError, match="Pathway-999"):
        library.pathway("Pathway-999")
    with pytest.raises(KeyError):
        library.entry("kl-000000")


def test_wrong_type_accessor_raises_keyerror(library: loader.KnowledgeLibrary) -> None:
    """impact() must not return a pathway just because the display id resolves."""
    with pytest.raises(KeyError):
        library.impact("Pathway-901")


def test_load_is_cached_per_resolved_path(fixture_root: pathlib.Path) -> None:
    assert loader.load(fixture_root) is loader.load(fixture_root)


def test_clear_cache_forces_a_reload(fixture_root: pathlib.Path) -> None:
    first = loader.load(fixture_root)
    loader.clear_cache()
    assert loader.load(fixture_root) is not first


def test_the_snapshot_cannot_be_edited_through_its_mappings(
    library: loader.KnowledgeLibrary,
) -> None:
    with pytest.raises(TypeError):
        library._entries[EntryType.pathway] = ()  # type: ignore[index]
    with pytest.raises(TypeError):
        library._by_key["kl-900101"] = library.entry("kl-900301")  # type: ignore[index]


def test_collections_are_typed(library: loader.KnowledgeLibrary) -> None:
    assert len(library.pathways) == 3
    assert len(library.behaviors) == 2
    assert len(library.user_behaviors) == 1
    assert len(library.impacts) == 1


def _break(root: pathlib.Path, name: str) -> None:
    """Make one ai_behavior entry fail validation, keeping its id parseable."""
    path = root / "entries" / "ai_behaviors" / name
    path.write_text(f"id: {name.removesuffix('.yaml')}\ntype: ai_behavior\n", encoding="utf-8")


def test_every_failing_entry_is_reported_and_says_why(mutable_root: pathlib.Path) -> None:
    """One run names every broken file, with the fields that failed, not only which."""
    _break(mutable_root, "kl-900001.yaml")
    _break(mutable_root, "kl-900002.yaml")

    with pytest.raises(loader.LibraryParseError) as caught:
        loader.load(mutable_root)

    message = str(caught.value)
    assert len(caught.value.problems) == 2
    assert "ai_behaviors/kl-900001.yaml: display_id: Field required" in message
    assert "ai_behaviors/kl-900002.yaml: display_id: Field required" in message


def test_a_yaml_syntax_error_keeps_its_location(mutable_root: pathlib.Path) -> None:
    """A yaml error's line, column and source excerpt reach the message."""
    unparseable = mutable_root / "entries" / "ai_behaviors" / "kl-900001.yaml"
    unparseable.write_text("id: kl-900001\ntype: ai_behavior\n  bad: indent\n", encoding="utf-8")

    with pytest.raises(loader.LibraryParseError) as caught:
        loader.load(mutable_root)

    message = str(caught.value)
    assert "ai_behaviors/kl-900001.yaml: ScannerError:" in message
    assert 'in "<unicode string>", line 3, column' in message
    assert "bad: indent" in message


def test_sources_load_into_their_own_collection(library: loader.KnowledgeLibrary) -> None:
    """Sources are not entries: they load beside them and do not join all_entries()."""
    assert [s.id for s in library.sources] == ["kl-900901"]
    assert library.source("kl-900901").display_id == "Source-901"
    assert "kl-900901" not in {e.id for e in library.all_entries()}


def test_an_unknown_source_is_a_keyerror(library: loader.KnowledgeLibrary) -> None:
    with pytest.raises(KeyError):
        library.source("kl-999999")


def test_sources_are_listed_in_id_order(mutable_root: pathlib.Path) -> None:
    """The contract is id order, which is not the order filenames sort in."""
    sources = mutable_root / "entries" / "sources"
    original = (sources / "kl-900901.yaml").read_text()
    (sources / "aaa.yaml").write_text(
        original.replace("id: kl-900901", "id: kl-900999").replace(
            "display_id: Source-901", "display_id: Source-999"
        )
    )
    loader.clear_cache()
    assert [s.id for s in loader.load(mutable_root).sources] == ["kl-900901", "kl-900999"]


def test_digest_is_stable_across_loads(fixture_root: pathlib.Path) -> None:
    first = loader.load(fixture_root).digest
    loader.clear_cache()
    assert loader.load(fixture_root).digest == first


def test_digest_is_prefixed_and_short(library: loader.KnowledgeLibrary) -> None:
    assert library.digest.startswith("sha256:")
    assert len(library.digest) == len("sha256:") + 16


def test_digest_changes_when_content_changes(
    fixture_root: pathlib.Path, mutable_root: pathlib.Path
) -> None:
    before = loader.load(fixture_root).digest
    target = mutable_root / "entries" / "impacts" / "kl-900301.yaml"
    # Quote the mutated value: PyYAML strips a trailing space from an
    # unquoted scalar, so "Impact-901 " would parse back as "Impact-901"
    # and the digest (from model_dump, not file bytes) would not move.
    target.write_text(target.read_text().replace("Impact-901", '"Impact-901 "'))
    loader.clear_cache()
    assert loader.load(mutable_root).digest != before


def test_digest_changes_when_only_a_source_changes(
    fixture_root: pathlib.Path, mutable_root: pathlib.Path
) -> None:
    """Sources are content. A digest over entries alone would miss this edit."""
    before = loader.load(fixture_root).digest
    target = mutable_root / "entries" / "sources" / "kl-900901.yaml"
    target.write_text(target.read_text().replace("Source-901", '"Source-901 "'))
    loader.clear_cache()
    assert loader.load(mutable_root).digest != before


def test_digest_ignores_where_the_library_lives(
    fixture_root: pathlib.Path, mutable_root: pathlib.Path
) -> None:
    """A copy in a different directory is the same library."""
    before = loader.load(fixture_root).digest
    loader.clear_cache()
    assert loader.load(mutable_root).digest == before
