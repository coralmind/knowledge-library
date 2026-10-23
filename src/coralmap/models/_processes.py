"""Processes and operator acts: neither read from the transcript nor claimed about the person.

A mechanism is a process asserted to carry behavior to outcome, explanatory
rather than scored. An operator action is an act by the deployer, evidenced
outside the transcript entirely.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import Field

from coralmap.models._base import Base, contract
from coralmap.models._entry import Entry
from coralmap.vocabularies import EntryType, Valence


class MechanismBody(Base):
    """A causal process a behavior runs through.

    Names the operation rather than any one occurrence of it: a mechanism
    typically operates over a wider span than a single instance is detectable
    in, which is what ``operates_over`` records.
    """

    process_kind: str | None = Field(default=None, description="The kind of process asserted.")
    comparison_object_kinds: tuple[str, ...] = Field(
        default=(),
        description="What the mechanism's operation is judged against: the "
        "counterfactual the claim implicitly compares to.",
    )
    operates_over: str | None = Field(
        default=None,
        description="The temporal scope the mechanism presupposes, which may be "
        "wider than any single instance's detection window.",
    )
    instances: tuple[dict[str, Any], ...] = Field(
        default=(),
        description="The named behaviors this mechanism runs through. Each item: "
        "`id`, `content_policy` (the topic the instance concerns), "
        "`detectable_in`, and `constitutive` (whether the instance is "
        "definitional of the mechanism rather than an example).",
    )
    maintains: tuple[dict[str, Any], ...] = Field(
        default=(),
        description="Clinical conditions this mechanism is asserted to help "
        "sustain. Each item: `condition`, `process`, and an optional `note`.",
    )
    flip_condition: str | None = Field(
        default=None,
        description="The condition under which the mechanism's direction reverses.",
    )


class OperatorActionBody(Base):
    """A choice made by whoever deployed the system, not by the system.

    Recorded as a risk rather than a realized harm: an operator action sets
    the conditions a response is produced under, and the harm, where it
    follows, belongs to the pathway.
    """

    valence: Valence = Field(
        description="Operator actions are recorded as `risk` rather than as a realized harm."
    )
    actor: str = Field(description="Who performed the act.")
    observable_from: str = Field(
        description="Where the act is documented. Explicitly not the transcript."
    )
    forms: tuple[dict[str, Any], ...] = Field(
        default=(),
        description="Named sub-forms this action takes. Each item: `name` and "
        "`note`. A sub-form is a variant of the same act; something that is its "
        "own act is its own entry.",
    )
    il_layers: tuple[str, ...] = Field(
        default=(),
        description="Cross-reference to the impact-ladder scheme.",
    )


# ---------------------------------------------------------------------------
# Entries
# ---------------------------------------------------------------------------


class Mechanism(Entry[Literal[EntryType.mechanism]]):
    """A mechanism entry."""

    type: Literal[EntryType.mechanism] = contract(
        default=EntryType.mechanism, description="Fixed discriminator for this slot."
    )
    body: MechanismBody = contract(description="A process by which one thing produces another.")


class OperatorAction(Entry[Literal[EntryType.operator_action]]):
    """An operator action entry."""

    type: Literal[EntryType.operator_action] = contract(
        default=EntryType.operator_action, description="Fixed discriminator for this slot."
    )
    body: OperatorActionBody = contract(description="An act by the operator or deployer.")
