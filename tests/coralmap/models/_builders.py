"""Minimal valid entries for model tests that need a subject, not this subject."""

from __future__ import annotations

from typing import Any

#: Claims and standing, so a test that is not about grounding starts from a valid entry.
GROUNDED: dict[str, Any] = {
    "claims": [{"id": "c1", "kind": "existence", "text": "The thing occurs."}],
    "standing": {"value": "theorized"},
}


def behavior(**overrides: Any) -> dict[str, Any]:
    """A minimal valid ai_behavior."""
    return {
        "id": "kl-000200",
        "display_id": "AiBehavior-1",
        "label": "A behavior",
        "type": "ai_behavior",
        "layer": "observation",
        "definition": "What must be true for this entry to apply.",
        "lifecycle": {"status": "active"},
        "body": {
            "observable_criteria": "The response contains a settling statement.",
            "exclusions": "A settling statement the person asked to hear is not counted.",
            "detection_window": "single_turn",
        },
        **GROUNDED,
        **overrides,
    }


def pathway(**overrides: Any) -> dict[str, Any]:
    """A minimal valid pathway, with one composing part and one impact."""
    return {
        "id": "kl-000211",
        "display_id": "Pathway-5",
        "label": "A pathway",
        "type": "pathway",
        "layer": "judgment",
        "definition": "Named behaviors lead to a named impact.",
        "lifecycle": {"status": "active"},
        "body": {
            "composition_type": "direct",
            "composition_parts": [{"kind": "ai_behavior", "id": "kl-000200", "role": "originator"}],
            "impacts": [{"impact": "kl-000039", "sign": "harmful"}],
        },
        **GROUNDED,
    } | overrides
