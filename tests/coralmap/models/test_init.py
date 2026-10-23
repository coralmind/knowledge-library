"""Tests for ``coralmap.models``: the registry that maps an entry type to its model."""

from __future__ import annotations

import pytest

from coralmap.models import ENTRY_MODELS, Entry
from coralmap.vocabularies import EntryType


@pytest.mark.parametrize("entry_type", list(EntryType))
def test_every_entry_type_has_a_model(entry_type: EntryType) -> None:
    assert issubclass(ENTRY_MODELS[entry_type], Entry)
