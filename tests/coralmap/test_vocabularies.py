"""Tests for ``coralmap.vocabularies``."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from coralmap.models import AiBehavior
from tests.coralmap.models._builders import behavior


def test_vocabularies_are_closed() -> None:
    """A value outside the vocabulary fails validation."""
    with pytest.raises(ValidationError, match="layer"):
        AiBehavior.model_validate(behavior(layer="vibes"))
