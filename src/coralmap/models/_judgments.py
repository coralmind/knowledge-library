"""The judgment layer: what the catalog claims about what it observes.

One claim at three scales. An impact is the outcome asserted; a pathway asserts
a route from named behaviors to it; an experience cluster asserts a trajectory
composed of pathways. ``PathwayImpactEdge`` is the join between the first two.
"""

from __future__ import annotations

import re
from typing import Annotated, Any, Literal, Self

from pydantic import Field, model_validator

from coralmap.models._base import Base, KlId, contract, contract_validator
from coralmap.models._entry import Entry
from coralmap.models._evidence import CasePassage
from coralmap.vocabularies import (
    BasisKind,
    CompositionType,
    EntryType,
    Horizon,
    ImpactDomain,
    ImpactKind,
    LevelOfAnalysis,
    OnsetMode,
    PartKind,
    PartRole,
    Sign,
    Valence,
)


class ImpactBody(Base):
    """An outcome a pathway leads to.

    Carries the outcome's own properties: its valence, what kind of thing it
    is, and the domain of life it falls in. It does not carry how it is
    reached: that is the pathway's.
    """

    valence: Valence = Field(description="Whether this is a harm or a benefit.")
    impact_kind: ImpactKind | None = Field(
        default=None,
        description="Whether the outcome is a state, a pattern, or a foregone benefit.",
    )
    domain: ImpactDomain | None = Field(
        default=None, description="The area of life or functioning affected."
    )
    il_layers: tuple[str, ...] = Field(
        default=(),
        description="Cross-reference to the external impact-ladder layering scheme.",
    )
    dissociation_claims: Any | None = Field(
        default=None,
        description="Where this impact is claimed to occur independently of another.",
    )


class BehaviorPart(Base):
    """A part naming a behavior: something that happened, or under ``role: condition``, had to."""

    kind: Literal[PartKind.ai_behavior, PartKind.user_behavior] = contract(
        description="Which side of the transcript the behavior sits on. Must "
        "match the target entry's `type`, and names the list the id is found in."
    )
    id: str = contract(
        description="The behavior entry's kl- id, or `OWED` where the part "
        "names a requirement no entry fills yet."
    )
    role: PartRole = contract(
        description="What this part does here. `condition` gates the claim; "
        "every other value composes it."
    )
    absent: bool = contract(
        default=False,
        description="The behavior must NOT occur for the pathway to hold. The "
        "part still belongs to the composition; what is asserted is its absence.",
    )
    owed: bool = Field(
        default=False,
        description="No entry fills this part yet. `id` is `OWED` and "
        "`owed_behavior` states what would fill it.",
    )
    owed_behavior: str | None = Field(
        default=None,
        description="What an entry filling this part would have to assert, "
        "written so someone could author it. Required when `owed`.",
    )

    # A part that replaced an unwired target records the old id as `_id_was`:
    # which entry a part used to name is authoring history, not something the
    # part asserts, so it is internal and undeclared.

    @model_validator(mode="after")
    def _owed_is_fully_stated(self) -> Self:
        """An owed part names what is owed, and a filled part names an entry."""
        is_owed = self.id == "OWED"
        if is_owed != self.owed:
            raise ValueError(
                f"id={self.id!r} and owed={self.owed} disagree: an unfilled part "
                "carries both `id: OWED` and `owed: true`"
            )
        if is_owed and not (self.owed_behavior or "").strip():
            raise ValueError("an owed part requires `owed_behavior`")
        if not is_owed and not re.fullmatch(r"kl-\d{6}", self.id):
            raise ValueError(f"part id {self.id!r} is neither a kl- id nor `OWED`")
        return self


class ContextPart(Base):
    """A part naming a context value: a fact the test case must hold for the pathway to apply."""

    kind: Literal[PartKind.context_value] = contract(
        description="Fixed: the part names a context value."
    )
    id: KlId = contract(description="The context value's kl- id.")
    role: Literal[PartRole.condition] = contract(
        description="Always `condition`: a context value gates the claim and never composes it."
    )
    absent: bool = contract(
        default=False,
        description="The negation: the test case records a value on the "
        "dimension and it is not this one. An unrecorded dimension satisfies "
        "neither this part nor its negation.",
    )


#: One item of `composition_parts`, its class selected by `kind`.
Part = Annotated[BehaviorPart | ContextPart, Field(discriminator="kind")]


class PathwayImpactEdge(Base):
    """Where a pathway leads."""

    impact: KlId = contract(description="The impact entry this pathway leads to.")
    sign: Sign = contract(
        description="Whether the edge runs toward or away from harm. A "
        "protective pathway is not a failure to detect."
    )
    onset_mode: OnsetMode | None = contract(
        default=None, description="Whether the impact is new, worsened, foregone, or held in place."
    )
    horizon: Horizon | None = Field(default=None, description="How soon the impact follows.")
    level_of_analysis: LevelOfAnalysis | None = Field(
        default=None, description="Whether the claim is about this person or a rate."
    )
    basis_kind: BasisKind | None = Field(
        default=None,
        description="How this causal edge was arrived at. Most edges are "
        "specification-derived rather than measured.",
    )
    evidence: tuple[CasePassage, ...] = Field(
        default=(), description="Passages from sources that bear on this edge."
    )


class PathwayBody(Base):
    """A route from what happened to an outcome, and the terms it holds under.

    Composed of one authored list. ``composition_parts`` holds every term the
    pathway is built from, and each part's ``role`` sorts it into one of two
    derived views: ``preconditions()`` for the parts that gate the claim,
    ``observations()`` for the parts that compose it.

    The preconditions are part of the pathway's identity. Two pathways with the
    same observations and different preconditions are two entries. A condition
    that changes how strongly a pathway holds is expressed that way too, as a
    separate pathway, and there is no field for it.
    """

    composition_parts: tuple[Part, ...] = contract(
        min_length=1,
        description="The one authored list: everything the pathway is composed "
        "of or gated by. `observations()` and `preconditions()` are views over "
        "it, keyed on each part's `role`; neither is stored.",
    )
    composition_type: CompositionType = contract(
        description="How the OBSERVATIONS compose. Scopes to `observations()`, "
        "not to every part: a condition-role part is not part of the "
        "composition this names.",
    )
    composition_instruction: str | None = contract(
        default=None,
        description="Composition that `composition_type` and the parts' roles "
        "cannot carry, in the entry's own terms. Read by the judge. Must say "
        "something the structure does not already say: never restates the "
        "type, a role, or a part's own criteria.",
    )
    counterpart_owed: str | None = Field(
        default=None,
        description="A counterpart this pathway implies that nobody has "
        "authored: what a well-handled version of this situation would look "
        "like, where no entry states it.",
    )

    impacts: tuple[PathwayImpactEdge, ...] = contract(
        min_length=1, description="The impacts this pathway leads to."
    )
    mechanisms: tuple[KlId, ...] = Field(
        default=(),
        description="mechanism entries asserted to drive this pathway.",
    )
    experience_cluster_candidate: str | None = Field(
        default=None,
        description="Flags the pathway as a candidate member of an experience "
        "cluster not yet composed.",
    )
    mediators: tuple[Any, ...] = Field(
        default=(),
        description="What sits between the behavior and the outcome.",
    )
    downstream: tuple[Any, ...] = Field(
        default=(),
        description="What this pathway's impact in turn feeds.",
    )
    temporal: dict[str, Any] | None = Field(
        default=None, description="Timing structure beyond the impact horizon."
    )
    mechanism_hypothesis: str | None = Field(
        default=None,
        description="A proposed mechanism not yet promoted to a mechanism entry.",
    )
    standing_minimum_question: str | None = Field(
        default=None,
        description="An open question about what this pathway's standing should be floored at.",
    )
    treatment_competition_concern: str | None = Field(
        default=None,
        description="Where the pathway may compete with a treatment the person "
        "is already receiving.",
    )

    @contract_validator
    def _composition_is_stated_once(self) -> Self:
        """A multi-part composition says how the parts combine, somewhere.

        ``composition_type`` names a pattern; ``composition_instruction`` carries
        what the pattern and the roles cannot. ``direct`` and ``omission`` describe
        a single observation and need no instruction; every other type asserts
        a relation between parts, and with more than one observation the entry
        owes a statement of what that relation is.
        """
        kind = self.composition_type
        n = sum(1 for p in self.composition_parts if p.role != PartRole.condition)
        if kind in {CompositionType.direct, CompositionType.omission} or n <= 1:
            return self
        if not (self.composition_instruction or "").strip():
            raise ValueError(
                f"composition_type {str(kind)!r} over {n} observations requires "
                "`composition_instruction`: the type names the pattern, not "
                "what these particular parts must do together"
            )
        return self

    @contract_validator
    def _instruction_says_something_new(self) -> Self:
        """The instruction must not restate what the structure already carries.

        The mechanical half only: an instruction whose whole content is the
        type's own name, or a role's, says nothing a consumer could not read
        from the typed fields. Whether an instruction restates a *part's own
        criteria* is a semantic judgment, which a pattern match cannot make, so
        it is left to whoever authors the entry.
        """
        text = (self.composition_instruction or "").strip().lower()
        if not text:
            return self
        bare = text.rstrip(".").replace("_", " ").strip()
        typed = {self.composition_type, *(p.role for p in self.composition_parts)}
        for name in typed:
            if name and bare == str(name).replace("_", " "):
                raise ValueError(
                    f"composition_instruction is just {str(name)!r}, which the typed "
                    "fields already state"
                )
        return self


class ExperienceClusterBody(Base):
    """A trajectory several pathways instantiate.

    A cluster is a shape over time, not a single route: membership is decided
    by ``identity_criterion``, and the pathways listed in ``composed_of`` are the
    configurations known to satisfy it.
    """

    identity_criterion: str | None = Field(
        default=None,
        description="The membership test: what must be true of a configuration "
        "for it to belong to this cluster.",
    )
    time_course: dict[str, Any] | None = Field(
        default=None,
        description="How long the trajectory typically runs and what shape it "
        "takes. Keys: `characteristic_span` and `shape`.",
    )
    composed_of: tuple[dict[str, Any], ...] = Field(
        default=(),
        description="The pathways that instantiate this cluster. Each item: "
        "`pathway` (a kl-id), `pathway_alias`, and `narrative_role` (the part "
        "this pathway plays in the cluster's story).",
    )
    susceptibility: tuple[dict[str, Any], ...] = Field(
        default=(),
        description="Population or subgroup variation in how the cluster "
        "manifests. Each item: `kind` and `note`.",
    )
    cross_listing: tuple[dict[str, Any], ...] = Field(
        default=(),
        description="Other clusters this one overlaps, and where the boundary sits.",
    )
    design_time_only: bool | None = Field(
        default=None,
        description="Marks the cluster as a design-time construct rather than "
        "something a detector scores at runtime.",
    )
    design_time_only_forbids: str | None = Field(
        default=None,
        description="What that design-time status explicitly rules out.",
    )


class Impact(Entry[Literal[EntryType.impact]]):
    type: Literal[EntryType.impact] = contract(
        default=EntryType.impact, description="Fixed discriminator for this slot."
    )
    body: ImpactBody = Field(description="An outcome pathways lead to.")


class Pathway(Entry[Literal[EntryType.pathway]]):
    type: Literal[EntryType.pathway] = contract(
        default=EntryType.pathway, description="Fixed discriminator for this slot."
    )
    body: PathwayBody = contract(description="A route from behaviors to an impact.")


class ExperienceCluster(Entry[Literal[EntryType.experience_cluster]]):
    type: Literal[EntryType.experience_cluster] = contract(
        default=EntryType.experience_cluster, description="Fixed discriminator for this slot."
    )
    body: ExperienceClusterBody = contract(description="A trajectory composed of pathways.")


class ContrastBody(Base):
    """The counterfactual as an entry, with its own evidence.

    Pairs a harmful pathway with the pathway describing a well-handled response
    in the same circumstances, so a consumer can see what should have happened
    as well as what went wrong.

    Distinct from the exclusive pair, which is a view and never an entry: that
    is two pathways over the same observations whose preconditions differ, and
    it derives. A contrast is the opposite case: members share observations
    AND preconditions, so only the response differs, and with the gates equal
    there is nothing left to derive the difference from. That is why the
    discriminator is authored.
    """

    members: tuple[KlId, ...] = contract(
        min_length=2,
        description="The pathways this contrast holds between. Two or more, "
        "over the same observations and the same preconditions.",
    )
    discriminator: tuple[Part, ...] = contract(
        min_length=1,
        description="What tells the responses apart. Authored, not derived: "
        "with the members' gates equal, nothing else states the difference.",
    )

    @contract_validator
    def _members_are_distinct(self) -> Self:
        """A contrast between an entry and itself states nothing."""
        if len(set(self.members)) != len(self.members):
            raise ValueError(f"members repeat an id: {self.members}")
        return self


class Contrast(Entry[Literal[EntryType.contrast]]):
    type: Literal[EntryType.contrast] = contract(
        default=EntryType.contrast, description="Fixed discriminator for this slot."
    )
    body: ContrastBody = contract(
        description="What should have happened instead, as a relation over pathways."
    )


class DivergenceMember(Base):
    """One pathway in a divergence, and the value that selects it."""

    pathway: KlId = contract(description="The member pathway's kl- id.")
    selecting_value: KlId = contract(
        description="The `context_value` on the divergence's dimension that "
        "selects this member: the value its gate names."
    )


class RelativeStrength(Base):
    """That one member leads to a shared impact more strongly than the others."""

    impact: KlId = contract(description="An impact every member leads to.")
    stronger_in: KlId = contract(
        description="The member pathway in which the link to `impact` is "
        "stronger. A comparative claim, so it needs a source of its own."
    )


class DivergenceBody(Base):
    """Pathways over the same observations, told apart by one context dimension.

    The opposite of a contrast: a contrast holds the situation fixed and varies
    the response; a divergence holds the response fixed and varies the person
    or situation. Each member gates on a different value of ``dimension``, so the
    same transcript runs down a different pathway depending on which value the
    test case records. Modulation (the same route, stronger in one value)
    is stated in ``relative``, never as a field on a pathway.
    """

    dimension: KlId = contract(
        description="The `context_dimension` whose values select the members."
    )
    members: tuple[DivergenceMember, ...] = contract(
        min_length=2,
        description="The pathways the divergence holds between, each with the "
        "value that selects it. Two or more, sharing `observations()`.",
    )
    exhaustive: bool = contract(
        description="Whether the members cover every value of the dimension, "
        "so that some member applies whatever value is recorded."
    )
    relative: tuple[RelativeStrength, ...] = contract(
        default=(),
        description="Where one member leads to a shared impact more strongly than the others.",
    )

    @model_validator(mode="after")
    def _members_are_distinct(self) -> Self:
        """Each member is its own pathway, selected by its own value."""
        pathways = [m.pathway for m in self.members]
        values = [m.selecting_value for m in self.members]
        if len(set(pathways)) != len(pathways):
            raise ValueError(f"members repeat a pathway: {pathways}")
        if len(set(values)) != len(values):
            raise ValueError(f"members repeat a selecting value: {values}")
        return self

    @model_validator(mode="after")
    def _stronger_in_names_a_member(self) -> Self:
        pathways = {m.pathway for m in self.members}
        stray = [r.stronger_in for r in self.relative if r.stronger_in not in pathways]
        if stray:
            raise ValueError(f"relative.stronger_in names non-members: {stray}")
        return self


class Divergence(Entry[Literal[EntryType.divergence]]):
    type: Literal[EntryType.divergence] = contract(
        default=EntryType.divergence, description="Fixed discriminator for this slot."
    )
    body: DivergenceBody = contract(
        description="Which value of one context dimension selects which pathway."
    )
