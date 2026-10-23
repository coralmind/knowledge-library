"""Filters and edge traversal over a loaded library.

An :class:`~coralmap.models.Entry` holds ids, not object references, so it
stays serializable and the digest stays a function of content alone.
Traversal goes through a view that pairs an entry with its library:
``kl.pathway("Pathway-5")`` returns a :class:`PathwayView`, whose
``.observations`` resolve to behavior entries.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import TYPE_CHECKING, Any, Generic, Self, TypeVar

from pydantic import BaseModel

from coralmap.models import Lifecycle, StandingBlock, observations, preconditions
from coralmap.vocabularies import EntryType

if TYPE_CHECKING:
    from coralmap.models import (
        AiBehavior,
        Entry,
        Impact,
        Mechanism,
        Pathway,
        UserBehavior,
    )

E = TypeVar("E", bound="Entry[Any]")

#: Nested blocks a filter compares by one field, so ``filter(standing="theorized")``
#: matches ``standing.value`` and ``filter(lifecycle="draft")`` matches ``lifecycle.status``.
_SCALAR_FIELD: dict[type[BaseModel], str] = {StandingBlock: "value", Lifecycle: "status"}


class EntryCollection(Generic[E]):
    """An iterable, filterable set of entries of one type, in authored order."""

    def __init__(self, entries: tuple[E, ...], *, model: type[E], library: Any) -> None:
        self._entries = entries
        self._model = model
        self._library = library

    def __iter__(self) -> Iterator[E]:
        return iter(self._entries)

    def __len__(self) -> int:
        return len(self._entries)

    def __repr__(self) -> str:
        return f"{type(self).__name__}({len(self._entries)} entries)"

    def __getitem__(self, key: str) -> E:
        """Look up by ``id`` or ``display_id``."""
        for entry in self._entries:
            if key in (entry.id, entry.display_id):
                return entry
        raise KeyError(f"no entry with id or display_id {key!r} in this collection")

    def _rebuild(self, entries: tuple[E, ...]) -> Self:
        """A collection of the same class, so filters compose."""
        return type(self)(entries, model=self._model, library=self._library)

    def filter(self, **criteria: object) -> Self:
        """Return the subset matching every keyword criterion.

        Keywords name fields on the entry or its ``body``, so
        ``filter(composition_type="omission", standing="theorized")`` works on
        pathways. Multiple criteria are ANDed, and the result is another
        collection.

        Raises:
            KeyError: on a criterion naming no field on this entry type, even
                when the collection is empty.
        """
        available = _field_names(self._model)
        for name in criteria:
            if name not in available:
                raise KeyError(
                    f"no field {name!r} on {self._model.__name__} or its body; "
                    f"available: {sorted(available)}"
                )
        kept = tuple(
            entry
            for entry in self._entries
            if all(_matches(entry, name, wanted) for name, wanted in criteria.items())
        )
        return self._rebuild(kept)


def _field_names(model: type[BaseModel]) -> set[str]:
    """Field names on the entry model and its body model, which filters treat as one namespace."""
    names = set(model.model_fields)
    body = model.model_fields.get("body")
    annotation = body.annotation if body is not None else None
    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        names |= set(annotation.model_fields)
    return names


def _read(entry: Any, name: str) -> Any:
    """The value of ``name``, looking at the entry first and then its body."""
    if name in type(entry).model_fields:
        value = getattr(entry, name)
    else:
        value = getattr(getattr(entry, "body", None), name, None)
    # A missing field is None. Only a model can be a key of ``_SCALAR_FIELD``.
    if isinstance(value, BaseModel):
        scalar = _SCALAR_FIELD.get(type(value))
        if scalar:
            return getattr(value, scalar)
    return value


def _matches(entry: Any, name: str, wanted: object) -> bool:
    """Whether ``entry``'s ``name`` equals ``wanted``.

    Vocabulary enums are string enums, so a plain string matches without
    importing the vocabulary.
    """
    return bool(_read(entry, name) == wanted)


class PathwayCollection(EntryCollection["Pathway"]):
    """Pathways, with the traversals that are specific to them."""

    def leading_to(self, impact: str | Impact) -> PathwayCollection:
        """Return the pathways whose ``impacts`` edges reach ``impact``.

        Accepts a display id (``"Impact-12"``), a machine id, an alias, or an
        :class:`~coralmap.models.Impact`. Direct edges only: pathway-to-pathway
        composition is not followed.

        Raises:
            KeyError: if ``impact`` names no impact.
        """
        target = self._resolve(impact, EntryType.impact)
        kept = tuple(
            pathway
            for pathway in self._entries
            if any(edge.impact == target for edge in pathway.body.impacts)
        )
        return self._rebuild(kept)

    def involving(self, behavior: str | AiBehavior | UserBehavior) -> PathwayCollection:
        """Return the pathways in which ``behavior`` is an observation.

        The inverse of :func:`coralmap.models.observations`. A part under
        ``role: condition`` gates the pathway and does not count.

        Raises:
            KeyError: if ``behavior`` names no AI or user behavior.
        """
        target = self._resolve(behavior, EntryType.ai_behavior, EntryType.user_behavior)
        kept = tuple(
            pathway
            for pathway in self._entries
            if any(part.id == target for part in observations(pathway.body))
        )
        return self._rebuild(kept)

    def _resolve(self, key: str | Entry[Any], *expected: EntryType) -> str:
        """The machine id of the entry ``key`` names, which must be one of ``expected``.

        A key that names nothing, or names the wrong type, raises rather than
        yielding an empty collection that looks like a real result.
        """
        found = self._library.entry(key) if isinstance(key, str) else key
        if found.type not in expected:
            wanted = " or ".join(t.value for t in expected)
            raise KeyError(
                f"{found.display_id} ({found.id}) is a {found.type.value}, not a {wanted}"
            )
        return str(found.id)


class PathwayView:
    """One pathway with its edges resolved to entries.

    Returned by ``kl.pathway(...)``. :attr:`entry` is the underlying
    immutable :class:`~coralmap.models.Pathway`.
    """

    def __init__(self, pathway: Pathway, *, library: Any) -> None:
        self._pathway = pathway
        self._library = library

    def __repr__(self) -> str:
        return f"PathwayView({self._pathway.display_id})"

    @property
    def entry(self) -> Pathway:
        """The underlying immutable record."""
        return self._pathway

    @property
    def id(self) -> str:
        """The pathway's ``kl-`` id."""
        return self._pathway.id

    @property
    def display_id(self) -> str:
        """The pathway's display id, e.g. ``"Pathway-5"``."""
        return self._pathway.display_id

    @property
    def label(self) -> str:
        """The pathway's short name."""
        return self._pathway.label

    def _resolve_all(self, ids: list[str]) -> tuple[Entry[Any], ...]:
        """Entries for ``ids``, skipping any that do not resolve.

        A dangling reference is reported by :meth:`KnowledgeLibrary.validate`;
        skipping it here keeps an invalid library readable.
        """
        found = []
        for target in ids:
            try:
                found.append(self._library.entry(target))
            except KeyError:
                continue
        return tuple(found)

    @property
    def observations(self) -> tuple[Entry[Any], ...]:
        """The parts that compose this pathway, resolved to entries.

        The parts in :func:`~coralmap.models.observations`: AI and user
        behaviors alike. A part not yet authored (``OWED``) is left out.
        """
        ids = [p.id for p in observations(self._pathway.body) if p.id != "OWED"]
        return self._resolve_all(ids)

    @property
    def preconditions(self) -> tuple[Entry[Any], ...]:
        """The parts that gate this pathway, resolved to entries.

        The parts in :func:`~coralmap.models.preconditions`: context values,
        and any behavior under ``role: condition``. Empty when the pathway
        holds generally.
        """
        ids = [p.id for p in preconditions(self._pathway.body) if p.id != "OWED"]
        return self._resolve_all(ids)

    @property
    def mechanisms(self) -> tuple[Mechanism, ...]:
        """The processes by which this pathway produces its impact."""
        resolved = self._resolve_all(list(self._pathway.body.mechanisms))
        return tuple(resolved)  # type: ignore[arg-type]

    @property
    def impacts(self) -> tuple[Impact, ...]:
        """The impacts this pathway leads to."""
        resolved = self._resolve_all([edge.impact for edge in self._pathway.body.impacts])
        return tuple(resolved)  # type: ignore[arg-type]

    @property
    def counterpart_owed(self) -> str | None:
        """What a well-handled version of this situation would look like, where no entry states it.

        ``None`` where a contrast entry states the counterpart instead.
        """
        return self._pathway.body.counterpart_owed
