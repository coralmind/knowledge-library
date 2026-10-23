"""The provenance layer: the source registry.

A source is not an :class:`~coralmap.models.Entry`. Its ``layer`` is
``provenance``, a sixth value outside the five an entry may carry, and it
carries no claims and no standing, because a source is what an entry cites
rather than something the catalog asserts. Its id is a ``kl-`` id like any
entry's.

A citation's ``source`` names a source, and everything a reader needs about the
work cited is on it: label, definition, the quality grade, and the cited-on
counts.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import date
from typing import Any, Literal, Self

from pydantic import BaseModel, Field, model_validator

from coralmap.models._base import Base, KlId
from coralmap.models._evidence import Lifecycle, StandingBlock
from coralmap.vocabularies import (
    LicenseStatus,
    PeerReviewed,
    ReplicationStatus,
    SourceKind,
    SourceQuality,
    StudiedAgent,
    StudyLevel,
    StudyPopulation,
)


class SourceBody(Base):
    """Bibliographic and quality-grade fields.

    Open, because the field set is long-tailed: most rows carry the grade
    bundle, and the provenance rows also carry retrieval and licensing notes in
    no fixed shape.

    Only ``kind`` and ``is_internal`` are required, being the two fields every row
    carries. The grade fields are optional because some rows lack them.
    """

    kind: SourceKind = Field(
        description="What kind of record this is. `internal_artifact` and "
        "`deliberation_record` are the project's own and are never evidence."
    )
    is_internal: bool = Field(
        description="Whether this is one of the project's own artifacts rather "
        "than external scholarship. A self-citation is not evidence."
    )

    title: str | None = Field(
        default=None,
        description="The work's title, as the work gives it.",
    )
    authors: tuple[str, ...] = Field(
        default=(),
        description="Author surnames, in the order the work lists them.",
    )
    year: int | None = Field(default=None, description="Year of publication.")
    venue: str | None = Field(default=None, description="Journal, conference, or preprint server.")
    identifier: str | None = Field(
        default=None, description="External identifier, often a DOI or arXiv id."
    )
    doi: str | None = Field(default=None, description="DOI, where recorded separately.")
    arxiv_id: str | None = Field(default=None, description="arXiv id, where recorded separately.")

    source_quality: SourceQuality | None = Field(
        default=None,
        description="The derived grade. Absent on the legacy provenance rows, "
        "which were never graded.",
    )
    grade_reasoning: str | None = Field(
        default=None, description="Why the work received that grade."
    )
    design: str | None = Field(default=None, description="How the study was run, where empirical.")
    design_caveat: str | None = Field(
        default=None,
        description="Limitations of the design as run, in the grader's words.",
    )
    design_fits_own_claims: bool | None = Field(
        default=None,
        description="Whether the design supports the claims the work itself makes.",
    )
    n_reported: int | None = Field(
        default=None, description="Sample or instance size as the work states it."
    )
    population: StudyPopulation | None = Field(
        default=None,
        description="Who the work studied. `model_only` means no human "
        "participants, which bounds what the work can say about people.",
    )
    agent_studied: StudiedAgent | None = Field(
        default=None,
        description="Whose conduct the work observed: the AI system's, the people's, or "
        "both. A work that observed only the AI says nothing measured about people.",
    )
    unit_of_analysis: StudyLevel | None = Field(
        default=None,
        description="The unit this work's data was collected over, such as repeated "
        "measures on one person or model responses with no participants. Distinct from "
        "an impact edge's `level_of_analysis`, which says whose outcome a claim is about.",
    )
    peer_reviewed: PeerReviewed | None = Field(
        default=None,
        description="The review status of the venue. `unknown` means not "
        "established, not that the work was unreviewed.",
    )
    preregistered: bool | Literal["unknown"] | None = Field(
        default=None,
        description="Whether the analysis was registered before data collection.",
    )
    replication_status: ReplicationStatus | None = Field(
        default=None,
        description="Whether this work replicates another, or has itself been "
        "replicated. `none_known` is the default and asserts absence of "
        "knowledge, not absence of replication.",
    )
    conflicts: str | None = Field(
        default=None,
        description="Conflicts of interest bearing on the work, as declared by "
        "the authors or apparent from their funding and affiliations.",
    )
    author_disclosure: str | None = Field(
        default=None, description="What the authors disclosed about their own stake."
    )
    integrity_flag: str | None = Field(
        default=None,
        description="Post-publication status: none, expression_of_concern, "
        "correction_issued, or retracted.",
    )

    other_version: KlId | None = Field(
        default=None,
        description="The source entry holding another version of the same work, such as the "
        "published version of a preprint. Set on both entries, where the two are registered "
        "separately because their texts differ and citations quote one or the other.",
    )
    canonical_record: str | None = Field(
        default=None, description="Where the authoritative record of this work lives."
    )
    license_status: LicenseStatus | None = Field(
        default=None,
        description="Whether the cited version may be reused. Requires `license_terms` "
        "and `verified_as_of` when set.",
    )
    license_terms: str | None = Field(
        default=None,
        description="The license the work states, such as CC BY-NC 3.0, where "
        "`license_status` alone does not name it.",
    )
    verified_as_of: str | None = Field(
        default=None,
        description="When the record was last checked against its source, as YYYY-MM-DD.",
    )

    @model_validator(mode="after")
    def _license_status_is_documented(self) -> Self:
        if self.license_status is None:
            return self
        if not (self.license_terms or "").strip():
            raise ValueError("license_status is set but license_terms is empty")
        verified = self.verified_as_of or ""
        try:
            parsed = date.fromisoformat(verified)
        except ValueError:
            parsed = None
        if parsed is None or parsed.isoformat() != verified:
            raise ValueError("license_status is set but verified_as_of is not a YYYY-MM-DD date")
        return self


class Source(Base):
    """One row in the source registry.

    Kept out of the entry models, so loading the catalog's entries means the
    authored slots and not these.
    """

    id: KlId = Field(description="Stable identifier.")
    label: str = Field(description="Short human name for the source.")
    type: Literal["source"] = Field(description="Fixed discriminator. Always `source`.")
    layer: Literal["provenance"] = Field(
        description="Fixed layer. A source is provenance, not observation or judgment."
    )
    definition: str = Field(description="What this source is, in one or two sentences.")
    body: SourceBody = Field(description="Bibliographic and quality-grade fields.")

    display_id: str | None = Field(
        default=None,
        description="Readable handle such as `Source-1`.",
    )
    lifecycle: Lifecycle | None = Field(
        default=None,
        description="draft, active, or deprecated, where the row records one.",
    )
    aliases: tuple[str, ...] = Field(
        default=(), description="Other handles this source is known by."
    )
    sources: tuple[Any, ...] | dict[str, Any] | None = Field(
        default=None, description="Nested source list, on a provenance row that cites one."
    )
    standing: StandingBlock | None = Field(
        default=None,
        description="Present where an older envelope required it. A source has no "
        "standing of its own: it is what standing is judged from.",
    )


def citation_counts(entries: Iterable[BaseModel | Mapping[str, Any]]) -> dict[str, tuple[int, int]]:
    """How often each source is cited, counted from the entries' ``claim_evidence`` rows.

    Returns, for every source cited at least once, the number of entries that
    cite it and the number of rows that do. One claim citing a source twice
    counts as two rows. A source that nothing cites is absent from the result.

    :param entries: catalog entries, as models or as the mappings they load from.
    """
    citing: dict[str, set[str]] = {}
    rows: dict[str, int] = {}
    for entry in entries:
        data = entry.model_dump() if isinstance(entry, BaseModel) else entry
        for row in data.get("claim_evidence") or ():
            source = row["source"]
            citing.setdefault(source, set()).add(data["id"])
            rows[source] = rows.get(source, 0) + 1
    return {source: (len(ids), rows[source]) for source, ids in citing.items()}
