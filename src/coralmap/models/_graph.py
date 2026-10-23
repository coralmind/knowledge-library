"""The relation graph, projected out of entries.

Entries declare relationships in typed, per-slot fields; no entry carries an
``edges`` list. :func:`edges` flattens every relation an entry declares to
another entry or a source, for code that walks them all at once.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from coralmap.models._base import KlId
from coralmap.models._contexts import ContextValueBody, PersonContextBody
from coralmap.models._entry import Entry
from coralmap.models._judgments import (
    ContrastBody,
    DivergenceBody,
    ExperienceClusterBody,
    PathwayBody,
)
from coralmap.models._observations import AiBehaviorBody, UserBehaviorBody
from coralmap.models._processes import MechanismBody
from coralmap.vocabularies import EdgeKind


class Edge(BaseModel):
    """A typed relationship from one entry to another."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    kind: EdgeKind = Field(description="Which relation this edge came from.")
    source: KlId = Field(description="`id` of the entry the relation is declared on.")
    to: str = Field(
        description="The target as authored: a kl- id or an alias handle. "
        "Resolving an alias needs every entry's `aliases`, so it "
        "happens in the library (`kl.entry()`) rather than here."
    )


def _ids(value: Any, key: str | None = None) -> list[str]:
    """Pull target ids out of a relation value, whatever shape it was authored in.

    The loosely typed relations (``downstream``, ``composed_of``,
    ``instances``) are authored as a bare id, a list of ids,
    or a list of objects carrying the id under a named key. The variation is
    absorbed here rather than normalized in the entries.
    """
    if value is None:
        return []
    if isinstance(value, BaseModel):
        value = value.model_dump()
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        found = value.get(key) if key else None
        return [found] if isinstance(found, str) else []
    if isinstance(value, list | tuple):
        return [found for item in value for found in _ids(item, key)]
    return []


def edges(entry: Entry[Any]) -> tuple[Edge, ...]:
    """Flatten an entry's typed relations into a uniform edge list.

    Targets come out exactly as authored: most are ``kl-`` ids, and a loosely
    typed relation may carry an alias handle. An entry holds no reference to
    the library it is in, so resolution belongs to the caller.

    Relations naming something outside the catalog are not edges and are
    skipped: ``il_layers`` points at an external layering scheme, ``maintains``
    names clinical conditions in prose, and ``mediators`` carries a measure
    rather than a referent.
    """
    body = getattr(entry, "body", None)
    found: list[Edge] = []

    def add(kind: EdgeKind, targets: list[str]) -> None:
        found.extend(Edge(kind=kind, source=entry.id, to=t) for t in targets)

    add(EdgeKind.distinguish_from, [d.neighbor for d in entry.distinguish_from])
    add(EdgeKind.citation, [c.source for c in entry.claim_evidence])
    add(EdgeKind.composed_of, _ids(entry.composed_of, "part"))
    add(EdgeKind.superseded_by, list(entry.lifecycle.superseded_by))

    if isinstance(body, PathwayBody):
        add(
            EdgeKind.composition_parts,
            [p.id for p in body.composition_parts if p.id != "OWED"],
        )
        add(EdgeKind.impacts, [i.impact for i in body.impacts])
        add(EdgeKind.mechanisms, list(body.mechanisms))
        add(EdgeKind.downstream, _ids(body.downstream, "impact"))
        add(EdgeKind.cluster_candidate, _ids(body.experience_cluster_candidate))
    elif isinstance(body, UserBehaviorBody):
        add(EdgeKind.condition_tags, list(body.condition_tags))
    elif isinstance(body, AiBehaviorBody):
        add(EdgeKind.reference_behavior, _ids(body.reference_behavior))
        irreversibility = body.irreversibility
        if irreversibility is not None:
            add(EdgeKind.irreversibility_conditions, list(irreversibility.conditions))
    elif isinstance(body, ExperienceClusterBody):
        add(EdgeKind.composed_of, _ids(body.composed_of, "pathway"))
    elif isinstance(body, MechanismBody):
        add(EdgeKind.instances, _ids(body.instances, "id"))
    elif isinstance(body, ContextValueBody):
        add(EdgeKind.dimension, [body.dimension])
        add(EdgeKind.covers, list(body.covers))
        add(EdgeKind.experience_clusters, list(body.experience_clusters))
    elif isinstance(body, PersonContextBody):
        add(EdgeKind.experience_clusters, list(body.experience_clusters))
    elif isinstance(body, ContrastBody):
        add(EdgeKind.members, list(body.members))
        add(EdgeKind.discriminator, [p.id for p in body.discriminator if p.id != "OWED"])
    elif isinstance(body, DivergenceBody):
        add(EdgeKind.dimension, [body.dimension])
        add(EdgeKind.members, [m.pathway for m in body.members])
        add(EdgeKind.selecting_value, [m.selecting_value for m in body.members])
        add(EdgeKind.relative_impact, [r.impact for r in body.relative])

    return tuple(found)
