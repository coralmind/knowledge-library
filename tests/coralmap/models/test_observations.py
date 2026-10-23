"""Tests for ``coralmap.models._observations``: how a behavior is recognized."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from coralmap.models import AiBehavior
from tests.coralmap.models._builders import behavior


def test_behavior_without_criteria_is_rejected() -> None:
    """A behavior needs ``observable_criteria`` or ``absence_criteria``."""
    with pytest.raises(ValidationError, match="how this behavior would be recognized"):
        AiBehavior.model_validate(
            behavior(body={"exclusions": "Not this.", "detection_window": "single_turn"})
        )


def test_omission_behavior_may_carry_absence_criteria_instead() -> None:
    entry = AiBehavior.model_validate(
        behavior(
            body={
                "absence_criteria": "No turn takes up the disclosed crisis.",
                "exclusions": "Not this.",
                "detection_window": "single_turn",
            }
        )
    )
    assert entry.body.observable_criteria is None
