"""How an entry is warranted and bounded.

The evidentiary apparatus every entry carries regardless of its layer: the
claims it decomposes into, the external evidence attached to each, the standing
verdict judged from that evidence, where the entry sits between authored and
retired, and what separates it from its neighbours.
"""

from __future__ import annotations

from typing import Any, Self

from pydantic import Field, model_validator

from coralmap.models._base import Base, KlId, contract
from coralmap.vocabularies import (
    CitationDisposition,
    ClaimKind,
    Contributes,
    Fit,
    LifecycleStatus,
    PassageConduct,
    Standing,
)


class Claim(Base):
    """One atomic, independently falsifiable assertion the entry makes."""

    id: str = Field(description="Local id, unique within the entry, e.g. 'c1'.")
    kind: ClaimKind = Field(description="What kind of assertion this claim makes.")
    text: str = Field(description="The claim in one sentence, stated so it could be false.")
    grounding_eligible: bool | None = Field(
        default=None,
        description="False when no citation can support this claim, so its having none is "
        "not a gap in the evidence: for example, a boundary against another catalog entry, "
        "which is settled by the two definitions. Omitted when citations can attach.",
    )


class ClaimEvidence(Base):
    """External evidence, one row per claim-source pair.

    Not a bibliographic reference: the same passage from the same paper appears
    once per claim it licenses, with ``licenses`` stating what it establishes for
    that claim specifically. Counting rows counts attachments, not works cited.
    """

    claim_id: str = Field(description="The local claim id this row attaches to.")
    source: KlId = Field(description="The work cited: the `id` of a source entry.")
    quote: str = Field(
        description="Verbatim from the source, machine-verified after "
        "normalization. A paraphrase fails."
    )
    locator: str = Field(
        description="Where in the source: section, table, figure, or page. "
        "A directory path is not a locator."
    )
    licenses: str = Field(
        description="What this quote establishes FOR THIS CLAIM, in the citation's own words. "
        "Must be at least as strong as the claim it supports."
    )
    fit: Fit = Field(
        description="Domain distance between the source and the claim. Independent "
        "of `contributes`, which is the role the quote plays."
    )
    contributes: Contributes = Field(
        description="The evidence role this citation plays. Four of the ten values "
        "cannot license an occurrence claim."
    )
    contradicts: bool = Field(
        default=False,
        description=(
            "The quote cuts against the claim. Required true when contributes is counterexample."
        ),
    )
    bridge: str | None = Field(
        default=None,
        description="The stated inference from what the source shows to what the "
        "claim asserts. Required for adjacent and analogical fit.",
    )

    @model_validator(mode="after")
    def _bridge_required_for_distant_fit(self) -> Self:
        if self.fit in (Fit.adjacent, Fit.analogical) and not (self.bridge or "").strip():
            raise ValueError(f"fit={self.fit.value} requires a non-empty `bridge`")
        return self

    @model_validator(mode="after")
    def _counterexample_contradicts(self) -> Self:
        if self.contributes is Contributes.counterexample and self.contradicts is not True:
            raise ValueError("contributes=counterexample requires contradicts=true")
        return self


class StandingBlock(Base):
    """The entry's evidential-strength verdict.

    A judgment of what the cited sources actually observed, made by reading them
    rather than by counting how citations are filed, and stated in ``basis``.
    Entry standing is the minimum over grounding-eligible claims: an entry
    asserts the conjunction of its claims, so it is only as observed as its
    least observed part.
    """

    value: Standing = Field(description="The entry's evidential standing.")
    basis: str | None = Field(default=None, description="Why this value was reached.")
    floored_by: str | None = Field(default=None, description="Which claim set the minimum.")
    as_of: str | None = Field(default=None, description="When standing was last judged.")


class Lifecycle(Base):
    """Where the entry sits between authored and retired."""

    status: LifecycleStatus = contract(description="draft, active, or deprecated.")
    since: Any | None = Field(default=None, description="ISO date the entry entered this status.")
    superseded_by: tuple[KlId, ...] = Field(
        default=(),
        description="The entries that replace this one, by id. Only a deprecated entry "
        "names successors; one split in two names both. Empty when the entry was retired "
        "with nothing in its place.",
    )

    @model_validator(mode="after")
    def _only_deprecated_entries_have_successors(self) -> Self:
        if self.superseded_by and self.status != LifecycleStatus.deprecated:
            raise ValueError(
                f"superseded_by is set on a {self.status.value} entry; "
                "only a deprecated entry has successors"
            )
        return self


class DistinguishFrom(Base):
    """A boundary statement against a neighbouring entry."""

    neighbor: KlId = contract(description="The neighbouring entry's id.")
    boundary: str = contract(
        description="What separates this entry from that neighbour. Resolves a "
        "judge's disagreement about which of two adjacent entries applies."
    )


class CasePassage(Base):
    """A passage from a source about one person in it.

    Cited where the source describes individual cases, such as a table of
    participants' reported experiences, and the passage shows that person
    reporting or displaying what the entry or edge asserts.
    """

    source: KlId = Field(description="The work cited: the `id` of a source entry.")
    quote: str = Field(description="The passage, verbatim from the source.")
    locator: str = Field(description="Where in the source: section, table, figure, or page.")
    quote_form: str | None = Field(
        default=None,
        description="What kind of passage the quote is, such as a participant's own words "
        "or the authors' description of a case.",
    )
    participant: str | None = Field(
        default=None,
        description="The source's label for the person the passage is about, such as P23.",
    )
    impact_class_in_source: str | None = Field(
        default=None,
        description="The source's own name for the category the passage falls under.",
    )
    licenses: str | None = Field(
        default=None,
        description="What this passage establishes, in the citation's own words.",
    )
    limits: str | None = Field(
        default=None,
        description="What the passage does not establish, such as a reported concern "
        "where the entry asserts a measured change.",
    )


class EntrySource(Base):
    """A source cited against the entry as a whole rather than against one claim.

    Kept beside ``claim_evidence``, whose rows each attach to a claim. Here
    ``cited_for`` says in prose what the passage is cited for.
    """

    source: KlId = Field(description="The work cited: the `id` of a source entry.")
    cited_for: str = Field(description="What the passage is cited for, in prose.")
    contributes: Contributes = Field(description="The evidence role this citation plays.")
    locator: str | None = Field(
        default=None, description="Where in the source: section, table, figure, or page."
    )
    quote: str | None = Field(default=None, description="The passage, verbatim from the source.")
    whose_conduct_in_passage: PassageConduct | None = Field(
        default=None,
        description="Whose conduct the passage shows. A passage showing only the AI's "
        "conduct says nothing observed about the person.",
    )
    licenses: str | None = Field(
        default=None, description="What this passage establishes, in the citation's own words."
    )
    actually_licenses: str | None = Field(
        default=None,
        description="What the passage supports on a strict reading, where that is narrower "
        "than `licenses` or than the role in `contributes` suggests.",
    )
    limits: str | None = Field(default=None, description="What the passage does not establish.")
    note: str | None = Field(
        default=None, description="A fact about the passage a reader needs to weigh it."
    )
    disposition: CitationDisposition | None = Field(
        default=None,
        description="Set when the source was read for this entry and found to support "
        "nothing it asserts, or to cut against it.",
    )
    evidence: tuple[CasePassage, ...] = Field(
        default=(), description="Individual cases in the source that the citation rests on."
    )


class Contested(Base):
    """An open question about whether the entry should exist as stated."""

    summary: str = Field(
        description="The question, and what each answer would mean for the entry. States "
        "the dispute; does not recount how it arose."
    )


class Measurement(Base):
    """What it would take to measure the entry's construct in a transcript."""

    what_would_be_needed: str = Field(
        description="The instrument or label that would measure the construct, and what "
        "existing instruments lack. Written where no surveyed instrument measures it."
    )
