"""Filtering and traversal over a loaded library."""

from __future__ import annotations

import pathlib

import pytest

from coralmap import loader


def test_collection_iterates_in_authored_order(library: loader.KnowledgeLibrary) -> None:
    assert [p.id for p in library.pathways] == ["kl-900101", "kl-900102", "kl-900103"]


def test_collection_length(library: loader.KnowledgeLibrary) -> None:
    assert len(library.behaviors) == 2


def test_getitem_accepts_either_identifier(library: loader.KnowledgeLibrary) -> None:
    assert library.behaviors["AiBehavior-901"].id == "kl-900001"
    assert library.behaviors["kl-900001"].display_id == "AiBehavior-901"


def test_getitem_raises_on_a_miss(library: loader.KnowledgeLibrary) -> None:
    with pytest.raises(KeyError):
        library.behaviors["AiBehavior-999"]


def test_filter_on_a_body_field(library: loader.KnowledgeLibrary) -> None:
    omissions = library.pathways.filter(composition_type="omission")
    assert [p.id for p in omissions] == ["kl-900103"]


def test_filter_on_an_entry_field(library: loader.KnowledgeLibrary) -> None:
    assert len(library.pathways.filter(type="pathway")) == 3


def test_filters_compose_and_are_anded(library: loader.KnowledgeLibrary) -> None:
    found = library.pathways.filter(composition_type="trajectory", layer="judgment")
    assert [p.id for p in found] == ["kl-900102"]
    assert len(library.pathways.filter(composition_type="trajectory", layer="observation")) == 0


def test_filter_returns_a_filterable_collection(library: loader.KnowledgeLibrary) -> None:
    assert len(library.pathways.filter(type="pathway").filter(composition_type="direct")) == 1


def test_unknown_criterion_raises_keyerror(library: loader.KnowledgeLibrary) -> None:
    with pytest.raises(KeyError, match="shaep"):
        library.pathways.filter(shaep="omission")


def test_unknown_criterion_raises_on_an_empty_collection(
    library: loader.KnowledgeLibrary,
) -> None:
    empty = library.pathways.filter(composition_type="no-such-type")
    assert len(empty) == 0
    with pytest.raises(KeyError, match="shaep"):
        empty.filter(shaep="omission")


def test_filter_by_standing_compares_its_value(mutable_root: pathlib.Path) -> None:
    target = mutable_root / "entries" / "pathways" / "kl-900101.yaml"
    target.write_text(target.read_text().replace("value: theorized", "value: plausible_unobserved"))
    library = loader.load(mutable_root)
    theorized = library.pathways.filter(standing="theorized")
    assert [p.id for p in theorized] == ["kl-900102", "kl-900103"]
    found = library.pathways.filter(composition_type="omission", standing="theorized")
    assert [p.id for p in found] == ["kl-900103"]


def test_filter_by_lifecycle_compares_its_status(library: loader.KnowledgeLibrary) -> None:
    assert len(library.pathways.filter(lifecycle="active")) == 3
    assert len(library.pathways.filter(lifecycle="draft")) == 0


def test_leading_to_accepts_a_display_id(library: loader.KnowledgeLibrary) -> None:
    found = library.pathways.leading_to("Impact-901")
    assert {p.id for p in found} == {"kl-900101", "kl-900102", "kl-900103"}


def test_leading_to_accepts_a_machine_id(library: loader.KnowledgeLibrary) -> None:
    assert len(library.pathways.leading_to("kl-900301")) == 3


def test_leading_to_accepts_an_entry(library: loader.KnowledgeLibrary) -> None:
    assert len(library.pathways.leading_to(library.impact("Impact-901"))) == 3


def test_leading_to_an_unknown_impact_raises(library: loader.KnowledgeLibrary) -> None:
    with pytest.raises(KeyError):
        library.pathways.leading_to("Impact-999")


def test_leading_to_rejects_an_entry_that_is_not_an_impact(
    library: loader.KnowledgeLibrary,
) -> None:
    with pytest.raises(KeyError, match="is a pathway"):
        library.pathways.leading_to("Pathway-901")
    with pytest.raises(KeyError):
        library.pathways.leading_to(library.pathway("Pathway-901").entry)  # type: ignore[arg-type]


def test_involving_rejects_an_entry_that_is_not_a_behavior(
    library: loader.KnowledgeLibrary,
) -> None:
    with pytest.raises(KeyError, match="impact"):
        library.pathways.involving("Impact-901")


def test_leading_to_returns_a_filterable_collection(library: loader.KnowledgeLibrary) -> None:
    found = library.pathways.leading_to("Impact-901").filter(composition_type="omission")
    assert [p.id for p in found] == ["kl-900103"]


def test_involving_finds_pathways_by_participant(library: loader.KnowledgeLibrary) -> None:
    assert {p.id for p in library.pathways.involving("AiBehavior-901")} == {
        "kl-900101",
        "kl-900102",
    }


def test_involving_accepts_a_user_behavior(library: loader.KnowledgeLibrary) -> None:
    assert {p.id for p in library.pathways.involving("kl-900501")} == {"kl-900102"}


def test_involving_ignores_a_condition_role_part(mutable_root: pathlib.Path) -> None:
    """involving is the inverse of observations, so a gate is not participation."""
    target = mutable_root / "entries" / "pathways" / "kl-900102.yaml"
    target.write_text(target.read_text().replace("role: initiator", "role: condition"))
    loader.clear_cache()
    library = loader.load(mutable_root)
    assert list(library.pathways.involving("kl-900501")) == []
    assert {p.id for p in library.pathways.involving("AiBehavior-901")} == {
        "kl-900101",
        "kl-900102",
    }


def test_view_exposes_the_underlying_record(library: loader.KnowledgeLibrary) -> None:
    view = library.pathway("Pathway-901")
    assert view.entry.id == "kl-900101"
    assert view.entry.display_id == "Pathway-901"


def test_view_exposes_identity(library: loader.KnowledgeLibrary) -> None:
    view = library.pathway("Pathway-901")
    assert (view.id, view.display_id, view.label) == (
        view.entry.id,
        view.entry.display_id,
        view.entry.label,
    )


def test_observations_resolve_to_entries(library: loader.KnowledgeLibrary) -> None:
    observations = library.pathway("Pathway-902").observations
    assert {p.id for p in observations} == {"kl-900001", "kl-900501"}
    assert {p.display_id for p in observations} == {"AiBehavior-901", "UserBehavior-901"}


def test_observations_may_mix_ai_and_user_behaviors(library: loader.KnowledgeLibrary) -> None:
    kinds = {p.type.value for p in library.pathway("Pathway-902").observations}
    assert kinds == {"ai_behavior", "user_behavior"}


def test_impacts_resolve_to_entries(library: loader.KnowledgeLibrary) -> None:
    assert [i.display_id for i in library.pathway("Pathway-901").impacts] == ["Impact-901"]


def test_preconditions_resolve_to_context_values(library: loader.KnowledgeLibrary) -> None:
    assert [m.id for m in library.pathway("Pathway-902").preconditions] == ["kl-900601"]


def test_mechanisms_resolve_to_entries(library: loader.KnowledgeLibrary) -> None:
    assert [m.display_id for m in library.pathway("Pathway-902").mechanisms] == ["Mechanism-901"]


def test_a_pathway_with_no_preconditions_yields_an_empty_tuple(
    library: loader.KnowledgeLibrary,
) -> None:
    assert library.pathway("Pathway-901").preconditions == ()


def test_counterpart_owed_is_prose_on_an_omission(library: loader.KnowledgeLibrary) -> None:
    found = library.pathway("Pathway-903").counterpart_owed
    assert isinstance(found, str)
    assert found.strip()


def test_counterpart_owed_is_none_on_a_non_omission(library: loader.KnowledgeLibrary) -> None:
    assert library.pathway("Pathway-901").counterpart_owed is None
