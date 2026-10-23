"""Tests for ``coralmap.models._entry``: the envelope every catalog entry carries."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from coralmap.models import AiBehavior
from coralmap.models._entry import LAYER_OF
from coralmap.vocabularies import EntryType
from tests.coralmap.models._builders import behavior


def test_entry_carries_its_identifiers() -> None:
    entry = AiBehavior.model_validate(behavior())
    assert entry.id == "kl-000200"
    assert entry.display_id == "AiBehavior-1"
    assert entry.type is EntryType.ai_behavior


def test_display_id_is_required() -> None:
    missing = behavior()
    del missing["display_id"]
    with pytest.raises(ValidationError, match="display_id"):
        AiBehavior.model_validate(missing)


def test_layer_must_match_type() -> None:
    """``layer`` is authored, but each type sits in exactly one."""
    with pytest.raises(ValidationError, match="ai_behavior entry sits in layer 'observation'"):
        AiBehavior.model_validate(behavior(layer="judgment"))


def test_every_entry_type_has_a_layer() -> None:
    assert set(LAYER_OF) == set(EntryType)


def test_current_entry_must_state_its_claims_and_standing() -> None:
    ungrounded = behavior()
    del ungrounded["claims"]
    with pytest.raises(ValidationError, match="no `claims`"):
        AiBehavior.model_validate(ungrounded)


def test_deprecated_entry_is_exempt_from_grounding() -> None:
    """A deprecated entry may omit ``claims`` and ``standing``."""
    retired = behavior(lifecycle={"status": "deprecated"})
    del retired["claims"]
    del retired["standing"]
    assert AiBehavior.model_validate(retired).standing is None


def test_claim_evidence_must_name_a_claim_on_this_entry() -> None:
    cited = behavior(
        claim_evidence=[
            {
                "claim_id": "c9",
                "source": "kl-000308",
                "quote": "A verbatim sentence.",
                "locator": "Section IV.B",
                "licenses": "That the thing occurs.",
                "fit": "direct",
                "contributes": "existence",
            }
        ]
    )
    with pytest.raises(ValidationError, match=r"claim ids not on this entry: \['c9'\]"):
        AiBehavior.model_validate(cited)
