"""Tests for ``coralmap.models._derived``: what a pathway asserts without storing it."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from coralmap.models import (
    BehaviorPart,
    ContextPart,
    Pathway,
    PathwayBody,
    detection_window,
    holds_for_test_case,
    observations,
    preconditions,
    sign,
)
from coralmap.vocabularies import PartRole, Sign


def _pathway(**body: Any) -> PathwayBody:
    entry = Pathway.model_validate(
        {
            "id": "kl-000211",
            "display_id": "Pathway-5",
            "label": "A pathway",
            "type": "pathway",
            "layer": "judgment",
            "definition": "Named behaviors lead to a named impact.",
            "lifecycle": {"status": "active"},
            "claims": [{"id": "c1", "kind": "existence", "text": "The thing occurs."}],
            "standing": {"value": "theorized"},
            "body": {
                "composition_type": "direct",
                "composition_parts": [
                    {"kind": "ai_behavior", "id": "kl-000200", "role": "originator"}
                ],
                "impacts": [{"impact": "kl-000039", "sign": "harmful"}],
                **body,
            },
        }
    )
    return entry.body


def test_observations_and_preconditions_split_on_role() -> None:
    body = _pathway(
        composition_parts=[
            {"kind": "ai_behavior", "id": "kl-000200", "role": "originator"},
            {"kind": "user_behavior", "id": "kl-000501", "role": "condition"},
            {"kind": "context_value", "id": "kl-000601", "role": "condition"},
        ]
    )
    assert [p.id for p in observations(body)] == ["kl-000200"]
    assert [p.id for p in preconditions(body)] == ["kl-000501", "kl-000601"]


def test_role_split_reads_a_role_that_was_not_coerced() -> None:
    """A part assembled without validation still sorts by its role value.

    ``model_validate`` coerces ``role`` to ``PartRole``. A part built another
    way can still hold the raw value. An unrecognized role composes, so it is
    an observation.
    """

    def body(role: object) -> PathwayBody:
        part = BehaviorPart.model_construct(
            kind="ai_behavior", id="kl-000200", role=role, absent=False, owed=False
        )
        return PathwayBody.model_construct(
            composition_parts=(part,), composition_type="direct", impacts=()
        )

    assert [p.id for p in observations(body("originator"))] == ["kl-000200"]
    assert list(preconditions(body("originator"))) == []
    assert list(observations(body("condition"))) == []
    assert [p.id for p in preconditions(body("condition"))] == ["kl-000200"]
    assert [p.id for p in observations(body("not-a-role"))] == ["kl-000200"]
    assert list(preconditions(body("not-a-role"))) == []

    class _Role:
        def __init__(self, value: str) -> None:
            self.value = value

    assert list(observations(body(_Role("condition")))) == []
    assert [p.id for p in preconditions(body(_Role("condition")))] == ["kl-000200"]
    assert [p.id for p in observations(body(PartRole.condition))] == []
    assert [p.id for p in preconditions(body(PartRole.originator))] == []


def test_sign_is_the_single_edge_direction() -> None:
    assert sign(_pathway()) is Sign.harmful


def test_sign_is_mixed_when_edges_disagree() -> None:
    body = _pathway(
        impacts=[
            {"impact": "kl-000039", "sign": "harmful"},
            {"impact": "kl-000040", "sign": "protective"},
        ]
    )
    assert sign(body) is Sign.mixed


def test_sign_is_none_when_a_pathway_leads_nowhere() -> None:
    empty = PathwayBody.model_construct(composition_parts=(), impacts=())
    assert sign(empty) is None


def test_detection_window_is_the_widest_observation() -> None:
    body = _pathway(
        composition_type="trajectory",
        composition_instruction="One part follows the other.",
        composition_parts=[
            {"kind": "ai_behavior", "id": "kl-000200", "role": "originator"},
            {"kind": "ai_behavior", "id": "kl-000201", "role": "originator"},
            {
                "kind": "ai_behavior",
                "id": "kl-000202",
                "role": "originator",
                "absent": True,
            },
        ],
    )
    windows = {
        "kl-000200": "single_turn",
        "kl-000201": "multi_turn",
        "kl-000202": "cross_session",
    }
    assert detection_window(body, windows.get) == "multi_turn"


def test_detection_window_is_none_when_no_part_has_one() -> None:
    assert detection_window(_pathway(), lambda _part: None) is None


def _value(dimension: str, *, covers: tuple[str, ...] = ()) -> SimpleNamespace:
    return SimpleNamespace(body=SimpleNamespace(dimension=dimension, covers=covers, ordinal=None))


def _dimension(cardinality: str = "many", value_space: str = "nominal") -> SimpleNamespace:
    return SimpleNamespace(body=SimpleNamespace(cardinality=cardinality, value_space=value_space))


def _part(absent: bool = False) -> ContextPart:
    return ContextPart.model_validate(
        {"kind": "context_value", "id": "kl-000601", "role": "condition", "absent": absent}
    )


def test_holds_for_test_case_is_unknown_when_the_dimension_is_unrecorded() -> None:
    lookup = {
        "kl-000601": _value("kl-000611"),
        "kl-000611": _dimension(),
        "kl-000701": _value("kl-000711"),
    }
    assert holds_for_test_case(_part(), ["kl-000701"], lookup.get) is None


def test_holds_for_test_case_matches_the_value_or_what_it_covers() -> None:
    lookup = {
        "kl-000601": _value("kl-000611", covers=("kl-000602",)),
        "kl-000611": _dimension(),
        "kl-000602": _value("kl-000611"),
    }
    other = {**lookup, "kl-000603": _value("kl-000611")}
    assert holds_for_test_case(_part(), ["kl-000602"], lookup.get) is True
    assert holds_for_test_case(_part(), ["kl-000603"], other.get) is False


def test_holds_for_test_case_negation_holds_when_another_value_is_recorded() -> None:
    lookup = {
        "kl-000601": _value("kl-000611"),
        "kl-000611": _dimension(),
        "kl-000602": _value("kl-000611"),
    }
    assert holds_for_test_case(_part(absent=True), ["kl-000602"], lookup.get) is True
    assert holds_for_test_case(_part(absent=True), ["kl-000601"], lookup.get) is False


def test_holds_for_test_case_rejects_a_fact_naming_nothing() -> None:
    lookup = {"kl-000601": _value("kl-000611"), "kl-000611": _dimension()}
    with pytest.raises(ValueError, match="facts name no entry"):
        holds_for_test_case(_part(), ["kl-000999"], lookup.get)
