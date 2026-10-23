"""The context layer: facts about the person or the situation a test case places them in.

Every context fact is a value on a dimension. A pathway's gate names a
``ContextValue``; how the fact was known in a run is the run's business, not the
catalog's.
"""

from __future__ import annotations

from typing import Any, Literal, Self

from pydantic import Field

from coralmap.models._base import Base, KlId, contract, contract_validator
from coralmap.models._entry import Entry
from coralmap.vocabularies import (
    Cardinality,
    CategoryScope,
    ContextAbout,
    ContextKind,
    EntryType,
    ValueSpace,
)


class ContextDimensionBody(Base):
    """A dimension a test case is built along.

    Not gateable itself: *session position* is not a claim, *fourth session or
    later* is. A pathway's condition-role part names a ``ContextValue`` on the
    dimension, never the dimension.
    """

    about: ContextAbout = contract(
        description="What the facts on this dimension are about. Decides where "
        "a value is recorded: `person` on the persona, every other group on "
        "the test case."
    )
    value_space: ValueSpace = contract(
        description="How the dimension's values are given. Decides how a gate "
        "naming one of them is evaluated."
    )
    admits: str | None = contract(
        default=None,
        description="What makes a value admissible, stated so an author can "
        "tell whether a proposed value falls under it. Required when "
        "`value_space` is `described`, and only then.",
    )
    cardinality: Cardinality = contract(
        description="Whether a test case records one value on this dimension "
        "or several. An `ordered` dimension is always `one`."
    )
    defines: str = contract(
        description="What varying this dimension does to a judgment. A "
        "dimension earns its place by changing a verdict, not by being "
        "nameable."
    )

    @contract_validator
    def _admits_exactly_when_described(self) -> Self:
        """A described dimension says what it admits; a listed one does not."""
        described = self.value_space == ValueSpace.described
        stated = bool((self.admits or "").strip())
        if described and not stated:
            raise ValueError(
                "value_space `described` requires `admits`: nothing else says "
                "which values belong on the dimension"
            )
        if stated and not described:
            raise ValueError(
                "`admits` is only for a `described` dimension; a listed one "
                "admits exactly the values that name it"
            )
        return self

    @contract_validator
    def _ordered_is_single_valued(self) -> Self:
        """An at-or-past gate is defined against one recorded value."""
        if self.value_space == ValueSpace.ordered and self.cardinality != Cardinality.one:
            raise ValueError(
                "an `ordered` dimension requires cardinality `one`: a gate "
                "holding at or past a value is read against a single value"
            )
        return self


class Bounds(Base):
    """The numeric range a value covers, both ends inclusive.

    A missing end is open. Lets a typed persona field, such as an age, be
    matched to a value without reading its definition.
    """

    min: float | None = contract(
        default=None, description="The lowest number the value covers. Absent means no lower bound."
    )
    max: float | None = contract(
        default=None,
        description="The highest number the value covers. Absent means no upper bound.",
    )

    @contract_validator
    def _a_range_is_stated(self) -> Self:
        if self.min is None and self.max is None:
            raise ValueError("bounds with neither end state no range; omit `bounds` instead")
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError(f"bounds min {self.min} exceeds max {self.max}")
        return self


class ContextValueBody(Base):
    """One value on a dimension: what a condition-role part and an assignment point at.

    The value is the entry itself: its ``id``, ``label``, ``definition`` and
    boundaries. The body says which dimension it sits on and how it is read.

    A value may stand for several others on its dimension through ``covers``.
    Parts combine by "and", so a pathway that holds for either of two
    presentations gates on one value covering both. A test case records the
    specific value it has, and the covering value holds for it.

    An unrecorded dimension is not a value meaning absence: *no current
    treatment* is a value of its own, and a test case that records nothing on
    the dimension says only that it did not specify it.
    """

    dimension: KlId = contract(description="The `context_dimension` this value sits on.")
    ordinal: int | None = contract(
        default=None,
        description="Position on the dimension. Required when the dimension is "
        "`ordered`, and only then; unique within the dimension. A gate naming "
        "this value holds at this ordinal or above.",
    )
    bounds: Bounds | None = contract(
        default=None,
        description="The numeric range the value covers, where it bands a "
        "number. On every value of a dimension or on none, and never "
        "overlapping another value's.",
    )
    covers: tuple[KlId, ...] = contract(
        default=(),
        description="Where this value names a union, the values on the same "
        "dimension it stands for: a gate naming it holds when it or any value "
        "it covers is recorded. Empty on an ordinary value. A covered value "
        "covers nothing itself, and a dimension with covering values is not "
        "`ordered`.",
    )
    detection_note: str | None = Field(
        default=None,
        description="What in a transcript establishes this value, for a run in "
        "which it is stated or inferred rather than asserted. Must not restate "
        "a neighbouring behavior's criteria.",
    )
    category_scope: CategoryScope | None = Field(
        default=None,
        description="How tightly this value maps to a recognized clinical category.",
    )
    icd_codes: Any | None = Field(
        default=None,
        description="ICD code(s) this value maps to. A by-analogy code discloses "
        "that no classification covers the value.",
    )
    experience_clusters: tuple[KlId, ...] = Field(
        default=(),
        description="kl- ids of the experience clusters this value wires to.",
    )
    boundary_note: str | None = Field(
        default=None, description="Where this value ends and a neighbour begins."
    )
    cluster_assignment_note: str | None = Field(
        default=None, description="Why this value maps to the clusters it lists."
    )
    example_failure: str | None = Field(
        default=None,
        description="A concrete case of the response failure this value bears on.",
    )
    rationale: str | None = Field(
        default=None, description="Why this value is carried as its own entry."
    )

    @contract_validator
    def _covers_other_values_once(self) -> Self:
        """A union names each of its values once."""
        if len(set(self.covers)) != len(self.covers):
            raise ValueError(f"covers repeats a value: {self.covers}")
        return self


class ContextDimension(Entry[Literal[EntryType.context_dimension]]):
    type: Literal[EntryType.context_dimension] = contract(
        default=EntryType.context_dimension,
        description="Fixed discriminator for this slot.",
    )
    body: ContextDimensionBody = contract(description="A dimension a test case is built along.")


class ContextValue(Entry[Literal[EntryType.context_value]]):
    type: Literal[EntryType.context_value] = contract(
        default=EntryType.context_value, description="Fixed discriminator for this slot."
    )
    aliases: tuple[str, ...] = contract(
        default=(),
        description="Other handles this value is known by. The readable tag a "
        "consumer sees where a behavior names this value.",
    )
    body: ContextValueBody = contract(description="One value on a context dimension.")


class PersonContextBody(Base):
    """A retired context entry, in the shape the catalog used before dimensions and values.

    Every entry of this type is deprecated. The shape stays so a retired id can
    still be loaded and read; a live contextual fact is a ``ContextValue`` on a
    ``ContextDimension``.
    """

    context_kind: ContextKind = contract(
        description="What kind of contextual fact this entry recorded.",
    )
    category_scope: CategoryScope | None = Field(
        default=None,
        description="How tightly this maps to a recognized clinical category.",
    )
    icd_codes: Any | None = Field(
        default=None,
        description="ICD-11 code(s) this maps to. A by-analogy code discloses "
        "that no classification covers the entry.",
    )
    experience_clusters: tuple[KlId, ...] = Field(
        default=(),
        description="kl- ids of the experience clusters this context wires to.",
    )
    detection_note: str | None = Field(
        default=None,
        description="How reliably this context can be inferred from conversation "
        "text, where it can be at all.",
    )
    cluster_assignment_note: str | None = Field(
        default=None, description="Why this entry maps to the clusters it lists."
    )
    boundary_note: str | None = Field(
        default=None, description="Where this context ends and a neighbour begins."
    )
    example_failure: str | None = Field(
        default=None,
        description="A concrete case of the response failure this context bears on.",
    )
    rationale: str | None = Field(
        default=None, description="Why this context is carried as its own entry."
    )


class PersonContext(Entry[Literal[EntryType.context]]):
    """A retired context entry. Every entry of this type is deprecated."""

    type: Literal[EntryType.context] = contract(
        default=EntryType.context, description="Fixed discriminator for this slot."
    )
    aliases: tuple[str, ...] = contract(
        default=(),
        description="Other handles this entry is known by. The readable tag a "
        "consumer sees where a behavior names this context.",
    )
    body: PersonContextBody = contract(description="A standing fact about the person's situation.")
