"""Tests for ``coralmap.models._graph``: edges are projected, never authored."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from coralmap.models import AiBehavior, Impact, Pathway, PersonContext, UserBehavior, edges
from coralmap.vocabularies import EdgeKind
from tests.coralmap.models._builders import behavior, pathway


def test_edges_are_derived_not_authored() -> None:
    """No entry declares an ``edges`` field, so supplying one is rejected."""
    with pytest.raises(ValidationError, match="undeclared public field"):
        Pathway.model_validate(pathway(edges=[{"kind": "impacts", "to": "kl-000039"}]))


def test_pathway_projects_its_parts_and_impacts() -> None:
    projected = {(e.kind, e.to) for e in edges(Pathway.model_validate(pathway()))}
    assert (EdgeKind.composition_parts, "kl-000200") in projected
    assert (EdgeKind.impacts, "kl-000039") in projected


def test_every_edge_records_the_entry_it_came_from() -> None:
    assert {e.source for e in edges(Pathway.model_validate(pathway()))} == {"kl-000211"}


def test_boundaries_and_citations_project_from_any_entry_type() -> None:
    entry = AiBehavior.model_validate(
        behavior(
            distinguish_from=[
                {"neighbor": "kl-000257", "boundary": "That reads a multi-turn shape."}
            ],
            claim_evidence=[
                {
                    "claim_id": "c1",
                    "source": "kl-000308",
                    "quote": "A verbatim sentence.",
                    "locator": "Section IV.B",
                    "licenses": "That the thing occurs.",
                    "fit": "direct",
                    "contributes": "existence",
                }
            ],
        )
    )
    projected = {(e.kind, e.to) for e in edges(entry)}
    assert (EdgeKind.distinguish_from, "kl-000257") in projected
    assert (EdgeKind.citation, "kl-000308") in projected


def test_context_projects_its_experience_clusters() -> None:
    """A context entry names its experience clusters by id, and each becomes an edge."""
    entry = PersonContext.model_validate(
        behavior(
            id="kl-000600",
            display_id="Context-1",
            type="context",
            layer="context",
            body={"context_kind": "condition", "experience_clusters": ["kl-000700"]},
        )
    )
    assert [e.to for e in edges(entry) if e.kind is EdgeKind.experience_clusters] == ["kl-000700"]


def test_user_behavior_projects_its_condition_tags() -> None:
    entry = UserBehavior.model_validate(
        behavior(
            id="kl-000300",
            display_id="UserBehavior-1",
            type="user_behavior",
            body={
                "observable_criteria": "The person returns after each settling statement.",
                "condition_tags": ["kl-000600"],
                "exclusions": "Not this.",
                "detection_window": "single_turn",
            },
        )
    )
    assert (EdgeKind.condition_tags, "kl-000600") in {(e.kind, e.to) for e in edges(entry)}


def test_irreversibility_conditions_are_projected() -> None:
    entry = AiBehavior.model_validate(
        behavior(
            body={
                "observable_criteria": "The response endorses the stated plan.",
                "exclusions": "Not this.",
                "detection_window": "single_turn",
                "irreversibility": {
                    "scope": "condition_specific",
                    "conditions": ["kl-000600"],
                    "ratified": False,
                },
            }
        )
    )
    projected = {(e.kind, e.to) for e in edges(entry)}
    assert (EdgeKind.irreversibility_conditions, "kl-000600") in projected


def test_relations_naming_things_outside_the_catalog_are_not_edges() -> None:
    """``il_layers`` points at an external scheme, so it is not a graph edge."""
    entry = Impact.model_validate(
        behavior(
            id="kl-000039",
            display_id="Impact-12",
            type="impact",
            layer="judgment",
            body={"valence": "negative", "il_layers": ["IL-2", "IL-3"]},
        )
    )
    assert not [e for e in edges(entry) if e.to.startswith("IL-")]


def test_prose_counterpart_owed_is_not_projected_as_a_reference() -> None:
    """An omission's referent is a description of what should have happened, not an entry."""
    body = pathway()["body"] | {
        "composition_type": "omission",
        "counterpart_owed": "An inquiry into...",
    }
    entry = Pathway.model_validate(pathway(body=body))
    assert all(e.to.startswith("kl-") for e in edges(entry))
