"""Tests for ``coralmap.models._judgments``: pathways and the rules on their bodies."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from coralmap.models import Pathway
from tests.coralmap.models._builders import pathway


def test_several_composing_parts_require_a_composition_instruction() -> None:
    body = pathway()["body"] | {
        "composition_type": "conjunctive",
        "composition_parts": [
            {"kind": "ai_behavior", "id": "kl-000200", "role": "originator"},
            {"kind": "user_behavior", "id": "kl-000201", "role": "sustainer"},
        ],
    }
    with pytest.raises(ValidationError, match="requires `composition_instruction`"):
        Pathway.model_validate(pathway(body=body))


def test_a_pathway_does_not_store_its_window() -> None:
    """A pathway's window is computed from its parts, so authoring one is rejected."""
    body = pathway()["body"] | {"detection_window": "single_turn"}
    with pytest.raises(ValidationError, match="undeclared public field"):
        Pathway.model_validate(pathway(body=body))
