"""Graph-level checks. Every one returns a list; none of them raise."""

from __future__ import annotations

import pathlib

from coralmap import loader, validate


def test_a_clean_library_has_no_problems(library: loader.KnowledgeLibrary) -> None:
    assert library.validate() == []


def test_validate_library_is_what_the_method_calls(library: loader.KnowledgeLibrary) -> None:
    assert validate.validate_library(library) == library.validate()


def _load(root: pathlib.Path) -> loader.KnowledgeLibrary:
    loader.clear_cache()
    return loader.load(root)


def test_dangling_edge_target_is_reported(mutable_root: pathlib.Path) -> None:
    target = mutable_root / "entries" / "pathways" / "kl-900101.yaml"
    target.write_text(target.read_text().replace("impact: kl-900301", "impact: kl-900999"))
    problems = validate.check_edge_targets(_load(mutable_root))
    assert any("kl-900999" in p for p in problems)
    assert any("kl-900101" in p for p in problems)


def test_citation_edges_are_not_checked_against_entries(
    library: loader.KnowledgeLibrary,
) -> None:
    """A citation names a source, which is not an entry, so the entry check skips it."""
    assert not any("kl-900901" in p for p in validate.check_edge_targets(library))


def test_edge_kind_pointing_at_the_wrong_type_is_reported(
    mutable_root: pathlib.Path,
) -> None:
    target = mutable_root / "entries" / "pathways" / "kl-900101.yaml"
    target.write_text(target.read_text().replace("impact: kl-900301", "impact: kl-900001"))
    problems = validate.check_edge_kinds(_load(mutable_root))
    assert any("kl-900001" in p for p in problems)


_CONTRAST = """\
id: kl-900751
display_id: Contrast-901
label: Inquiry asked or withheld
type: contrast
layer: judgment
definition: Two responses to the same disclosure; only whether risk is asked about differs.
body:
  members:
  - {first}
  - {second}
  discriminator:
  - kind: ai_behavior
    id: kl-900002
    role: non_interruptor
claims:
- id: c1
  kind: context_dependence
  text: Holding the disclosure fixed, asking about risk changes the outcome.
standing:
  value: plausible_unobserved
lifecycle:
  status: draft
"""


def _add_contrast(root: pathlib.Path, first: str, second: str) -> None:
    contrasts = root / "entries" / "contrasts"
    contrasts.mkdir(exist_ok=True)
    (contrasts / "kl-900751.yaml").write_text(_CONTRAST.format(first=first, second=second))


def test_a_well_formed_contrast_validates(mutable_root: pathlib.Path) -> None:
    _add_contrast(mutable_root, "kl-900101", "kl-900103")
    assert _load(mutable_root).validate() == []


def test_a_contrast_member_that_does_not_exist_is_reported(mutable_root: pathlib.Path) -> None:
    _add_contrast(mutable_root, "kl-900101", "kl-900199")
    problems = validate.check_edge_targets(_load(mutable_root))
    assert any("Contrast-901" in p and "members" in p and "kl-900199" in p for p in problems)


def test_a_contrast_member_that_is_not_a_pathway_is_reported(mutable_root: pathlib.Path) -> None:
    _add_contrast(mutable_root, "kl-900101", "kl-900001")
    problems = validate.check_edge_kinds(_load(mutable_root))
    assert any("Contrast-901" in p and "kl-900001" in p for p in problems)


def _supersede(root: pathlib.Path, successor: str) -> None:
    target = root / "entries" / "ai_behaviors" / "kl-900002.yaml"
    target.write_text(
        target.read_text().replace(
            "  status: active\n", f"  status: deprecated\n  superseded_by:\n  - {successor}\n"
        )
    )


def test_a_successor_of_the_same_type_validates(mutable_root: pathlib.Path) -> None:
    _supersede(mutable_root, "kl-900001")
    assert _load(mutable_root).validate() == []


def test_a_successor_that_does_not_exist_is_reported(mutable_root: pathlib.Path) -> None:
    _supersede(mutable_root, "kl-900099")
    problems = validate.check_edge_targets(_load(mutable_root))
    assert any("superseded_by" in p and "kl-900099" in p for p in problems)


def test_a_successor_of_another_type_is_reported(mutable_root: pathlib.Path) -> None:
    _supersede(mutable_root, "kl-900301")
    problems = validate.check_edge_kinds(_load(mutable_root))
    assert any("superseded_by" in p and "kl-900301" in p for p in problems)


def test_cluster_member_that_is_not_a_pathway_is_reported(mutable_root: pathlib.Path) -> None:
    target = mutable_root / "entries" / "experience_clusters" / "kl-900701.yaml"
    target.write_text(target.read_text().replace("pathway: kl-900101", "pathway: kl-900001"))
    problems = validate.check_cluster_members(_load(mutable_root))
    assert any("kl-900001" in p and "not a pathway" in p for p in problems)


def test_cluster_member_whose_alias_names_another_entry_is_reported(
    mutable_root: pathlib.Path,
) -> None:
    target = mutable_root / "entries" / "experience_clusters" / "kl-900701.yaml"
    target.write_text(
        target.read_text().replace(
            "- pathway: kl-900101\n", "- pathway: kl-900101\n    pathway_alias: kl-900102\n"
        )
    )
    problems = validate.check_cluster_members(_load(mutable_root))
    assert any("kl-900101" in p and "kl-900102" in p for p in problems)


def test_duplicate_display_id_is_reported(mutable_root: pathlib.Path) -> None:
    target = mutable_root / "entries" / "impacts" / "kl-900301.yaml"
    duplicate = target.parent / "kl-900302.yaml"
    duplicate.write_text(target.read_text().replace("id: kl-900301", "id: kl-900302"))
    problems = validate.check_identifiers(_load(mutable_root))
    assert any("Impact-901" in p for p in problems)


def test_omission_without_a_referent_is_reported(mutable_root: pathlib.Path) -> None:
    target = mutable_root / "entries" / "pathways" / "kl-900103.yaml"
    lines = [
        line
        for line in target.read_text().splitlines()
        if not line.strip().startswith("counterpart_owed:")
    ]
    target.write_text("\n".join(lines) + "\n")
    problems = validate.check_omission_referents(_load(mutable_root))
    assert any("Pathway-903" in p for p in problems)


def test_a_citation_to_a_missing_source_is_reported(mutable_root: pathlib.Path) -> None:
    (mutable_root / "entries" / "sources" / "kl-900901.yaml").unlink()
    problems = validate.check_citation_sources(_load(mutable_root))
    assert problems
    assert all("kl-900901" in p for p in problems)


def test_a_nested_case_passage_citing_a_missing_source_is_reported(
    mutable_root: pathlib.Path,
) -> None:
    """A passage under an entry-level source is a citation, even when its parent exists."""
    target = mutable_root / "entries" / "ai_behaviors" / "kl-900001.yaml"
    target.write_text(
        target.read_text()
        + """
sources:
- source: kl-900901
  cited_for: The fixture as a whole.
  contributes: existence
  evidence:
  - source: kl-900999
    quote: A passage whose source is not in the library.
    locator: p. 1
"""
    )
    problems = validate.check_citation_sources(_load(mutable_root))
    assert any("kl-900999" in p for p in problems)
    assert not any("kl-900901" in p and "kl-900999" not in p for p in problems)


def test_duplicate_source_id_is_reported(mutable_root: pathlib.Path) -> None:
    sources = mutable_root / "entries" / "sources"
    original = (sources / "kl-900901.yaml").read_text()
    (sources / "kl-900902.yaml").write_text(
        original.replace("display_id: Source-901", "display_id: Source-902")
    )
    problems = validate.check_source_identifiers(_load(mutable_root))
    assert any("kl-900901" in p for p in problems)


def test_every_check_returns_a_list_and_never_raises(
    library: loader.KnowledgeLibrary,
) -> None:
    for check in (
        validate.check_edge_targets,
        validate.check_edge_kinds,
        validate.check_cluster_members,
        validate.check_identifiers,
        validate.check_omission_referents,
        validate.check_citation_sources,
        validate.check_source_identifiers,
    ):
        found = check(library)
        assert isinstance(found, list)
        assert all(isinstance(item, str) for item in found)
