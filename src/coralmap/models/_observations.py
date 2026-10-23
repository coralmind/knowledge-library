"""The observation layer: what is readable from the transcript itself.

AI behaviors and user behaviors, each carrying the rubric that decides whether
it is present. A behavior states its own criteria; a pathway naming it as a part
does not reach in and restate them.
"""

from __future__ import annotations

from typing import Literal, Self

from pydantic import Field

from coralmap.models._base import Base, KlId, contract, contract_validator
from coralmap.models._entry import Entry
from coralmap.vocabularies import DetectableFrom, DetectionWindow, EntryType, PersonStateKind


class BehaviorBody(Base):
    """Shared by ai_behavior and user_behavior."""

    observable_criteria: str | None = contract(
        default=None,
        description="The judge rubric: what must be literally present for the "
        "behavior to be counted, written to be checkable against a transcript. "
        "Omission-shaped behaviors carry `absence_criteria` instead.",
    )
    absence_criteria: str | None = contract(
        default=None,
        description="What must be ABSENT for the behavior to be counted, for "
        "omission-shaped entries. Carried instead of `observable_criteria`.",
    )
    exclusions: str = contract(
        description="What looks similar but does not count. Keeps a judge's "
        "false-positive rate down.",
    )
    detection_window: DetectionWindow = contract(
        description="The minimum span sufficient to satisfy the criteria. Not "
        "the maximum a detector may read.",
    )
    groups: tuple[str, ...] = contract(
        default=(),
        description="Thematic clusters this behavior belongs to.",
    )

    @contract_validator
    def _has_a_rubric(self) -> Self:
        """A behavior carries present-criteria or absent-criteria, never neither."""
        present = (self.observable_criteria or "").strip()
        absent = (self.absence_criteria or "").strip()
        if not present and not absent:
            raise ValueError(
                "neither observable_criteria nor absence_criteria: nothing "
                "states how this behavior would be recognized"
            )
        return self


class Irreversibility(Base):
    """Marks a behavior whose harm no later response can undo.

    ``ratified`` says whether a qualified body has approved the assignment. Read
    it before reporting the flag as a severity finding.
    """

    scope: Literal["unconditional", "condition_specific"] = contract(
        description="`unconditional` applies wherever the behavior occurs. "
        "`condition_specific` applies only in the conditions named."
    )
    conditions: tuple[KlId, ...] = contract(
        default=(),
        description="Context value ids the irreversibility applies in. Required when "
        "scope is `condition_specific`.",
    )
    ratified: bool = contract(
        description="Whether a qualified body has approved this assignment. No "
        "default: silence reads neither as approval nor as a recorded refusal."
    )
    basis: str | None = Field(default=None, description="Where the assignment came from.")

    @contract_validator
    def _conditions_present_when_scoped(self) -> Self:
        if self.scope == "condition_specific" and not self.conditions:
            raise ValueError("scope=condition_specific requires a non-empty `conditions` list")
        return self


class AiBehaviorBody(BehaviorBody):
    """What the system did, as read from its own turns.

    Observable in the transcript without inference about intent or internal
    state. ``irreversibility`` is the one field that leaves description for
    judgment, and it is set only where the harm cannot be recovered from.
    """

    irreversibility: Irreversibility | None = contract(
        default=None,
        description="Set where this behavior's harm, once it has occurred, cannot "
        "be undone by any later response within that conversation.",
    )
    reference_behavior: str | None = contract(
        default=None,
        description="The named counterpart this entry is defined partly by contrast to.",
    )


class UserBehaviorBody(BehaviorBody):
    """What the person did, said, or reported.

    ``detectable_from`` is the field that bounds the claim: a state known only
    from what the person reported is not an observation of the state, and must
    not be read as one.
    """

    detectable_from: DetectableFrom | None = contract(
        default=None,
        description="What kind of transcript material the behavior is readable "
        "from. `person_report` means it is known only because the person said "
        "so, which a judge scoring conduct must not treat as observed.",
    )
    person_state_kind: PersonStateKind | None = contract(
        default=None, description="Whether this is a process, a pattern, or a state."
    )
    condition_tags: tuple[KlId, ...] = contract(
        default=(),
        description="Context value ids this behavior commonly co-occurs with. "
        "The link a persona generator follows to pick a plausible presentation. "
        "A co-occurrence, not a gate: the behavior is counted whatever the "
        "person's context.",
    )
    conceptual_group: str | None = Field(
        default=None,
        description="Classification metadata on a behavior that describes a symptom.",
    )
    cluster_primary: str | None = Field(
        default=None, description="Primary symptom cluster, on a behavior that describes a symptom."
    )
    cluster_secondary: str | None = Field(
        default=None, description="Secondary symptom cluster, where one applies."
    )
    pattern_type: str | None = Field(
        default=None,
        description="Classification metadata on a behavior that describes a symptom.",
    )


class AiBehavior(Entry[Literal[EntryType.ai_behavior]]):
    """An AI behavior entry."""

    type: Literal[EntryType.ai_behavior] = contract(
        default=EntryType.ai_behavior, description="Fixed discriminator for this slot."
    )
    body: AiBehaviorBody = contract(description="Conduct by the AI system.")


class UserBehavior(Entry[Literal[EntryType.user_behavior]]):
    """A user behavior entry."""

    type: Literal[EntryType.user_behavior] = contract(
        default=EntryType.user_behavior, description="Fixed discriminator for this slot."
    )
    body: UserBehaviorBody = contract(description="Conduct or state on the person's side.")
