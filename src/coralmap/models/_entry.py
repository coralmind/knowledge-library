"""The shared entry envelope.

Every catalog entry carries these fields whatever its layer: identity, the
prose definition, the evidentiary apparatus, and lifecycle. The per-slot
payload lives in ``body``, typed by each entry class in its own layer module.
"""

from __future__ import annotations

from typing import Generic, Self, TypeVar

from pydantic import Field, model_validator

from coralmap.models._base import Base, KlId, contract
from coralmap.models._evidence import (
    Claim,
    ClaimEvidence,
    Contested,
    DistinguishFrom,
    EntrySource,
    Lifecycle,
    Measurement,
    StandingBlock,
)
from coralmap.vocabularies import Contributes, EntryType, Layer, LifecycleStatus, PartKind

#: The one layer each entry type sits in. ``layer`` is authored on every entry,
#: so a load checks it against this rather than trusting it.
LAYER_OF: dict[EntryType, Layer] = {
    EntryType.ai_behavior: Layer.observation,
    EntryType.user_behavior: Layer.observation,
    EntryType.impact: Layer.judgment,
    EntryType.pathway: Layer.judgment,
    EntryType.experience_cluster: Layer.judgment,
    EntryType.contrast: Layer.judgment,
    EntryType.divergence: Layer.judgment,
    EntryType.context: Layer.context,
    EntryType.context_dimension: Layer.context,
    EntryType.context_value: Layer.context,
    EntryType.mechanism: Layer.process,
    EntryType.operator_action: Layer.operator,
}

# Parameter of ``type``. A subclass fixes it to one member so the override
# matches the specialized base attribute; a mutable attribute cannot be narrowed
# to a different type.
_Slot = TypeVar("_Slot", bound=EntryType)


class CompositionRow(Base):
    """One constituent of a composite entry."""

    part: KlId = Field(description="The constituent entry's id.")
    role: str = Field(description="What the constituent contributes to the composite.")


class Entry(Base, Generic[_Slot]):
    """Fields common to every catalog entry.

    Parameterized by the slot ``type`` is fixed to, so a subclass can narrow
    that attribute to one ``EntryType`` member. A collection of mixed slots is
    ``Entry[Any]``.
    """

    id: KlId = contract(description="Stable identifier, `kl-` followed by six digits.")
    display_id: str = contract(
        description="Human-facing handle, e.g. `Pathway-5`, for a report to show. "
        "Changes when an entry is re-familied, so a consumer looks entries up by `id`."
    )
    label: str = contract(description="Short human name for the entry.")
    type: _Slot = contract(description="Which catalog slot this entry belongs to.")
    layer: Layer = Field(description="What kind of thing the entry asserts.")
    definition: str = contract(
        description="The full prose definition: what must be true for this entry "
        "to apply. What a generator paraphrases into a persona instruction or "
        "system-knowledge fact."
    )
    lifecycle: Lifecycle = contract(description="Whether the entry is draft, active, or retired.")

    aliases: tuple[str, ...] = Field(
        default=(),
        description="Other handles this entry is known by: readable names a "
        "consumer may show in place of the kl- id.",
    )
    distinguish_from: tuple[DistinguishFrom, ...] = contract(
        default=(),
        description="Boundary statements against neighbouring entries: what "
        "separates this from the thing it is most often confused with.",
    )
    claims: tuple[Claim, ...] = Field(
        default=(),
        description="The entry decomposed into atomic, independently falsifiable "
        "assertions. Grounding attaches here rather than to the entry.",
    )
    claim_evidence: tuple[ClaimEvidence, ...] = Field(
        default=(),
        description="External evidence, one row per claim-source pair.",
    )
    standing: StandingBlock | None = Field(
        default=None,
        description="The entry's evidential-strength verdict, a judgment of what its cited "
        "sources observed, with the reasoning in `basis`.",
    )

    sources: tuple[EntrySource, ...] = Field(
        default=(),
        description="Evidence cited against the whole entry rather than against a "
        "claim, kept alongside `claim_evidence`.",
    )
    context: tuple[str, ...] = Field(
        default=(),
        description="References to standing context notes, which are statements about the "
        "territory that bear on many entries and license none of them.",
    )

    contested: Contested | None = Field(
        default=None,
        description="An open question about whether the entry should exist as stated.",
    )
    measurement: Measurement | None = Field(
        default=None,
        description="What it would take to measure the entry's construct, where no "
        "surveyed instrument does.",
    )
    composed_of: tuple[CompositionRow, ...] = Field(
        default=(),
        description="Constituent entries, where the entry is a composite of others.",
    )

    @model_validator(mode="after")
    def _layer_matches_type(self) -> Self:
        expected = LAYER_OF[self.type]
        if self.layer is not expected:
            raise ValueError(
                f"a {self.type.value} entry sits in layer {expected.value!r}, "
                f"not {self.layer.value!r}"
            )
        return self

    @model_validator(mode="after")
    def _grounded_unless_deprecated(self) -> Self:
        if self.lifecycle.status is LifecycleStatus.deprecated:
            return self
        if not self.claims:
            raise ValueError("non-deprecated entry has no `claims`")
        if self.standing is None:
            raise ValueError("non-deprecated entry has no `standing`")
        return self

    @model_validator(mode="after")
    def _claim_evidence_resolves_to_claims(self) -> Self:
        ids = {c.id for c in self.claims}
        dangling = sorted({c.claim_id for c in self.claim_evidence if c.claim_id not in ids})
        if dangling:
            raise ValueError(f"claim_evidence names claim ids not on this entry: {dangling}")
        return self

    @model_validator(mode="after")
    def _context_dependence_needs_a_context_part(self) -> Self:
        """Evidence for a context dependence needs a gate on a context value.

        A citation contributing ``context_dependence`` supports a claim that the
        outcome turns on a fact about the test case. Only a pathway states such a
        fact, as a ``context_value`` part, so the citation is allowed only on a
        pathway that has one. Elsewhere the claim contradicts the entry's own
        structure.
        """
        cited = [
            i
            for i, c in enumerate(self.claim_evidence)
            if c.contributes is Contributes.context_dependence
        ]
        if not cited:
            return self
        parts = getattr(getattr(self, "body", None), "composition_parts", None)
        if parts is None:
            raise ValueError(
                f"claim_evidence {cited} contribute context_dependence, which needs a "
                f"pathway gated on a context value; this entry's type is {self.type.value}"
            )
        if not any(getattr(p, "kind", None) is PartKind.context_value for p in parts):
            raise ValueError(
                f"claim_evidence {cited} contribute context_dependence, but no part of "
                "this pathway names a context value"
            )
        return self
