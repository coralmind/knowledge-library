"""What a pathway asserts without storing it.

Each function here computes a value from a pathway's authored fields, so the
value is never stored and cannot fall out of step with the fields it comes
from. :func:`observations` and :func:`preconditions` are the two views over a
pathway's one authored list, split by each part's ``role``.

How a precondition was established (asserted to the system, stated in the
transcript, inferred over turns) is a property of a run, and nothing here
reads it. ``holds_for_test_case()`` takes the facts a test case records and says
whether one part naming a context value holds.
"""

from __future__ import annotations

from collections.abc import Callable, Collection
from typing import Any

from coralmap.models._judgments import ContextPart, Part, PathwayBody
from coralmap.vocabularies import DetectionWindow, PartKind, PartRole, Sign

#: Narrowest to widest. A pathway cannot be read on a span narrower than the
#: widest span any of its observations needs.
_WINDOW_ORDER: tuple[str, ...] = (
    DetectionWindow.single_turn.value,
    DetectionWindow.turn_pair.value,
    DetectionWindow.multi_turn.value,
    DetectionWindow.cross_session.value,
)


def _role_of(part: Part) -> PartRole | None:
    """``part.role`` as a ``PartRole``, whatever it was constructed from.

    Validation coerces the field. A part built without it can still hold the
    raw value, and a value that names no role sorts as an observation.
    """
    role: object = part.role
    if isinstance(role, PartRole):
        return role
    raw = role if isinstance(role, str) else getattr(role, "value", None)
    if not isinstance(raw, str):
        return None
    try:
        return PartRole(raw)
    except ValueError:
        return None


def _identity(parts: tuple[Part, ...]) -> frozenset[tuple[str, bool, str | None]]:
    """What distinguishes one set of parts from another.

    Absence is part of the claim: *X happened* and *X did not happen* name the
    same entry and assert opposite things, so a comparison keyed on the id
    alone would call them identical. And every owed part shares the id ``OWED``,
    so the requirement each names is what tells them apart.
    """
    return frozenset(
        (p.id, p.absent, getattr(p, "owed_behavior", None) if p.id == "OWED" else None)
        for p in parts
    )


def observations(body: PathwayBody) -> tuple[Part, ...]:
    """The parts whose role composes: what happened.

    The set ``composition_type`` and ``composition_instruction`` describe. A
    condition-role part is not among them: it gates the claim rather than
    taking part in the pattern the type names.
    """
    return tuple(
        p for p in body.composition_parts if (r := _role_of(p)) is None or not r.is_condition_like
    )


def preconditions(body: PathwayBody) -> tuple[Part, ...]:
    """The parts whose role is condition-like: the identity gate.

    Constitutive: change a part this returns and the pathway asserts something
    else, so it is a different pathway.
    """
    return tuple(
        p for p in body.composition_parts if (r := _role_of(p)) is not None and r.is_condition_like
    )


def sign(body: PathwayBody) -> Sign | None:
    """The pathway's overall direction, over the signs on its impact edges.

    Returns ``mixed`` where the edges disagree. A pathway with a harmful edge and
    a protective edge asserts both outcomes.
    """
    signs = {e.sign for e in body.impacts}
    if not signs:
        return None
    if len(signs) > 1:
        return Sign.mixed
    return Sign(next(iter(signs)))


def detection_window(body: PathwayBody, window_of: Callable[[str], str | None]) -> str | None:
    """The minimum span a judge needs to decide whether the pathway fired.

    The widest window among the parts in ``observations()``, since no part can be
    read on a span narrower than its own.

    ``window_of`` maps a part id to that entry's own ``detection_window``. Passing a
    resolver rather than the library keeps an entry a plain record with no
    reference to the catalog holding it, which is also why ``edges()`` returns
    targets as authored and leaves resolution to its caller.

    Parts marked ``absent`` are skipped: what is asserted is that they did not
    occur, and a non-occurrence needs no span to read. Counting one would
    inflate the span a consumer is told the pathway needs.

    Returns ``None`` when no part resolves to an entry carrying a window: an owed
    part names no entry, and a pathway made only of owed parts cannot state the
    span it needs.
    """
    windows = [
        w
        for p in observations(body)
        if not p.absent and (w := window_of(p.id)) is not None and w in _WINDOW_ORDER
    ]
    if not windows:
        return None
    return max(windows, key=_WINDOW_ORDER.index)


def exclusive_pair(a: PathwayBody, b: PathwayBody) -> bool:
    """Whether two pathways are the same observations under incompatible gates.

    The pair is a view, never an authored entry: two pathways over the same
    observations whose preconditions cannot both hold are alternatives, and
    that follows from what they already state.

    Incompatible here means *different*, which is the weaker reading: this
    reads the bodies alone and cannot see the dimension a part's value sits on.
    Two values on one ``one`` dimension exclude each other; a caller needing
    true mutual exclusion checks it with ``holds_for_test_case()``.
    """
    if not a.composition_parts or not b.composition_parts:
        return False
    if _identity(observations(a)) != _identity(observations(b)):
        return False
    pre_a, pre_b = _identity(preconditions(a)), _identity(preconditions(b))
    return bool(pre_a or pre_b) and pre_a != pre_b


def holds_for_test_case(
    part: ContextPart,
    facts: str | Collection[str],
    lookup: Callable[[str], Any],
) -> bool | None:
    """Whether a part naming a context value holds for a test case.

    ``facts`` is every value id the test case records; ``lookup`` maps an id to its
    entry, or ``None``. Returns ``None`` when nothing is recorded on the part's
    dimension. That is *unknown*, which a gate treats as not holding. Raises
    ``ValueError`` for a fact naming nothing, or a record the dimension cannot carry.

    A part naming a covering value holds when the value itself or any value in
    its ``covers`` is recorded, and its negation holds when values are recorded
    on the dimension and none of them is among those.
    """
    if part.kind != PartKind.context_value:
        raise ValueError(
            f"{part.id} is a {part.kind} part; only a context value is held by a test case"
        )
    value = lookup(part.id)
    dim_id = getattr(getattr(value, "body", None), "dimension", None)
    dimension = lookup(dim_id) if dim_id else None
    if dimension is None:
        raise ValueError(f"{part.id} is not a value on a known dimension")
    ids = {facts} if isinstance(facts, str) else set(facts)
    entries = {kl: lookup(kl) for kl in ids}
    unknown = sorted(kl for kl, e in entries.items() if e is None)
    if unknown:
        raise ValueError(f"facts name no entry: {unknown}")
    recorded = {kl: e for kl, e in entries.items() if getattr(e.body, "dimension", None) == dim_id}
    if not recorded:
        return None
    if dimension.body.cardinality == "one" and len(recorded) > 1:
        raise ValueError(f"{dim_id} records a single value, not {sorted(recorded)}")
    covered = {part.id, *getattr(value.body, "covers", ())}
    if dimension.body.value_space == "ordered":
        if len(covered) > 1:
            raise ValueError(f"{part.id} covers other values on ordered {dim_id}")
        ((kl, entry),) = recorded.items()
        at, named = entry.body.ordinal, value.body.ordinal
        if at is None or named is None:
            raise ValueError(f"an ordered gate needs both ordinals: {kl}={at}, {part.id}={named}")
        reached = at >= named
    else:
        reached = bool(covered & recorded.keys())
    return not reached if part.absent else reached
