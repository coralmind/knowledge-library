"""Tests for ``coralmap.models._sources``: citation counts and the license fields."""

from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError

from coralmap.models import citation_counts
from coralmap.models._sources import SourceBody


def test_citation_counts_rows_and_entries() -> None:
    entries: list[dict[str, Any]] = [
        {"id": "kl-000001", "claim_evidence": [{"source": "kl-000901"}, {"source": "kl-000901"}]},
        {"id": "kl-000002", "claim_evidence": [{"source": "kl-000901"}]},
        {"id": "kl-000003", "claim_evidence": []},
    ]
    assert citation_counts(entries) == {"kl-000901": (2, 3)}


BODY: dict[str, Any] = {"kind": "empirical_study", "is_internal": False}


def test_license_status_with_terms_and_date_is_valid() -> None:
    body = SourceBody.model_validate(
        {
            **BODY,
            "license_status": "known_permissive",
            "license_terms": "CC BY 4.0",
            "verified_as_of": "2026-10-17",
        }
    )
    assert body.license_status == "known_permissive"


def test_license_status_is_optional() -> None:
    assert SourceBody.model_validate(BODY).license_status is None


@pytest.mark.parametrize(
    "fields",
    [
        {
            "license_status": "known_permisive",
            "license_terms": "CC BY 4.0",
            "verified_as_of": "2026-10-17",
        },
        {"license_status": "known_restrictive", "verified_as_of": "2026-10-17"},
        {
            "license_status": "known_restrictive",
            "license_terms": "  ",
            "verified_as_of": "2026-10-17",
        },
        {"license_status": "unknown", "license_terms": "Not established"},
        {
            "license_status": "unknown",
            "license_terms": "Not established",
            "verified_as_of": "Oct 2026",
        },
        {
            "license_status": "unknown",
            "license_terms": "Not established",
            "verified_as_of": "2026-02-31",
        },
    ],
)
def test_license_status_requires_a_known_value_terms_and_a_date(fields: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        SourceBody.model_validate({**BODY, **fields})
