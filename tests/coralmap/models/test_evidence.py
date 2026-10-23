"""Tests for ``coralmap.models._evidence``: how a claim is warranted."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from coralmap.models import AiBehavior
from coralmap.vocabularies import Standing
from tests.coralmap.models._builders import behavior


def test_adjacent_fit_requires_a_bridge() -> None:
    cited = behavior(
        claim_evidence=[
            {
                "claim_id": "c1",
                "source": "kl-000308",
                "quote": "A verbatim sentence.",
                "locator": "Section IV.B",
                "licenses": "That the thing occurs.",
                "fit": "adjacent",
                "contributes": "existence",
            }
        ]
    )
    with pytest.raises(ValidationError, match="requires a non-empty `bridge`"):
        AiBehavior.model_validate(cited)


def test_counterexample_must_declare_that_it_contradicts() -> None:
    cited = behavior(
        claim_evidence=[
            {
                "claim_id": "c1",
                "source": "kl-000308",
                "quote": "A verbatim sentence.",
                "locator": "Section IV.B",
                "licenses": "That the thing does not occur.",
                "fit": "direct",
                "contributes": "counterexample",
            }
        ]
    )
    with pytest.raises(ValidationError, match="requires contradicts=true"):
        AiBehavior.model_validate(cited)


def test_standing_carries_its_verdict() -> None:
    entry = AiBehavior.model_validate(behavior(standing={"value": "observed_in_transcripts"}))
    assert entry.standing is not None
    assert entry.standing.value is Standing.observed_in_transcripts


def test_boundary_targets_must_be_real_ids() -> None:
    """A boundary neighbor is a ``kl-`` id, not a display handle."""
    with pytest.raises(ValidationError, match="pattern"):
        AiBehavior.model_validate(
            behavior(distinguish_from=[{"neighbor": "HP-57", "boundary": "A distinction."}])
        )
