"""Tests for ``coralmap.models._base``: frozen models, internal keys, public and contract fields."""

from __future__ import annotations

from enum import Enum

import pytest
from pydantic import ValidationError

from coralmap import loader
from coralmap.models import AiBehavior
from tests.coralmap.models._builders import behavior


def test_entry_is_immutable() -> None:
    entry = AiBehavior.model_validate(behavior())
    with pytest.raises(ValidationError, match="frozen"):
        entry.display_id = "AiBehavior-2"  # type: ignore[misc]


def test_sequence_fields_are_tuples() -> None:
    """Sequences are tuples, so a frozen entry cannot be mutated in place either."""
    entry = AiBehavior.model_validate(behavior())
    assert isinstance(entry.claims, tuple)
    with pytest.raises(AttributeError):
        entry.claims.append(None)  # type: ignore[attr-defined]


def test_id_must_match_the_kl_pattern() -> None:
    with pytest.raises(ValidationError, match="pattern"):
        AiBehavior.model_validate(behavior(id="AiBehavior-1"))


def test_entry_rejects_undeclared_public_fields() -> None:
    with pytest.raises(ValidationError, match="undeclared public field"):
        AiBehavior.model_validate(behavior(observabl_criteria="a typo in a field name"))


def test_entry_accepts_underscore_prefixed_internal_fields() -> None:
    """Underscore-prefixed keys load but are left out of ``public_fields``."""
    entry = AiBehavior.model_validate(behavior(_authored_by="an author"))
    assert "_authored_by" not in entry.public_fields()


def test_public_fields_strips_internal_keys_at_every_depth() -> None:
    entry = AiBehavior.model_validate(
        behavior(standing={"value": "theorized", "_basis": "internal note"})
    )
    assert entry.public_fields()["standing"] == {"value": "theorized"}


def test_contract_fields_keeps_only_marked_fields() -> None:
    """Unmarked fields are dropped at the top level and inside nested models.

    ``claims``, ``standing`` and ``layer`` are public but not contract fields;
    ``Lifecycle.since`` and ``Irreversibility.basis`` are the nested case.
    Marked fields that are ``None`` are omitted, as in ``public_fields``.
    """
    entry = AiBehavior.model_validate(
        behavior(
            lifecycle={"status": "active", "since": "2026-01-01"},
            body={
                "observable_criteria": "The response contains a settling statement.",
                "exclusions": "A settling statement the person asked to hear is not counted.",
                "detection_window": "single_turn",
                "irreversibility": {
                    "scope": "unconditional",
                    "ratified": False,
                    "basis": "a basis note",
                },
            },
        )
    )

    rendered = entry.contract_fields()

    assert rendered["id"] == "kl-000200"
    assert "claims" not in rendered
    assert "standing" not in rendered
    assert "layer" not in rendered
    assert "since" not in rendered["lifecycle"]
    assert rendered["lifecycle"]["status"] is not None
    assert "basis" not in rendered["body"]["irreversibility"]
    assert rendered["body"]["irreversibility"]["ratified"] is False
    assert "absence_criteria" not in rendered["body"]
    assert isinstance(rendered["body"]["detection_window"], Enum)

    json_rendered = entry.contract_fields(mode="json")
    assert type(json_rendered["body"]["detection_window"]) is str
    assert type(json_rendered["lifecycle"]["status"]) is str


def test_json_mode_renders_enums_as_strings(library: loader.KnowledgeLibrary) -> None:
    """Checked with ``type(...) is str``, since a ``StrEnum`` member equals its value."""
    body = library.pathways["kl-900101"].body

    rendered = body.public_fields(mode="json")

    assert rendered["composition_type"] == "direct"
    assert rendered["composition_parts"][0]["kind"] == "ai_behavior"
    assert rendered["impacts"][0]["sign"] == "harmful"

    assert type(rendered["composition_type"]) is str
    assert type(rendered["composition_parts"][0]["kind"]) is str
    assert type(rendered["impacts"][0]["sign"]) is str


def test_public_fields_defaults_to_python_mode(library: loader.KnowledgeLibrary) -> None:
    """The default dump keeps enum members, at the top level and nested."""
    body = library.pathways["kl-900101"].body

    default = body.public_fields()

    assert isinstance(default["composition_type"], Enum)
    assert type(default["composition_type"]) is not str
    assert type(default["composition_parts"][0]["kind"]) is not str
    assert isinstance(body.public_fields(mode="python")["composition_type"], Enum)
    assert type(body.public_fields(mode="json")["composition_type"]) is str


def test_json_mode_still_strips_internal_keys() -> None:
    """Internal keys at the top level and nested are stripped in json mode too."""
    entry = AiBehavior.model_validate(
        behavior(
            _authored_by="an author",
            standing={"value": "theorized", "_basis": "internal note"},
        )
    )

    unstripped = entry.model_dump(mode="json", exclude_none=True)
    assert unstripped["_authored_by"] == "an author"
    assert unstripped["standing"]["_basis"] == "internal note"

    rendered = entry.public_fields(mode="json")

    assert "_authored_by" not in rendered
    assert rendered["standing"] == {"value": "theorized"}
    assert type(rendered["standing"]["value"]) is str
