"""Cross-reference integrity and whole-library invariants.

Schema conformance is checked per entry by :func:`~coralmap.loader.load`. The
checks here need the assembled library: whether an edge target exists, whether
it has the right type, whether an identifier is unique.

Every check returns ``list[str]``, empty meaning valid, so one run reports
every problem. A dangling reference fails silently downstream: an unresolved
pathway-to-impact edge drops that pathway out of ``pathways.leading_to()``
and every count built on it.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from coralmap.models import Contrast, ExperienceCluster, edges
from coralmap.vocabularies import CompositionType, EdgeKind, EntryType

if TYPE_CHECKING:
    from coralmap.loader import KnowledgeLibrary

#: Which entry types each edge kind may point at. `superseded_by` is absent
#: because its target must match the type of the entry declaring it.
EDGE_TARGET_TYPES: dict[EdgeKind, frozenset[EntryType]] = {
    EdgeKind.composition_parts: frozenset(
        {EntryType.ai_behavior, EntryType.user_behavior, EntryType.context_value}
    ),
    EdgeKind.impacts: frozenset({EntryType.impact}),
    EdgeKind.mechanisms: frozenset({EntryType.mechanism}),
    EdgeKind.condition_tags: frozenset({EntryType.context_value}),
    EdgeKind.irreversibility_conditions: frozenset({EntryType.context_value}),
    EdgeKind.covers: frozenset({EntryType.context_value}),
    EdgeKind.dimension: frozenset({EntryType.context_dimension}),
    EdgeKind.experience_clusters: frozenset({EntryType.experience_cluster}),
    EdgeKind.reference_behavior: frozenset({EntryType.ai_behavior}),
    EdgeKind.cluster_candidate: frozenset({EntryType.experience_cluster}),
    EdgeKind.downstream: frozenset({EntryType.impact}),
    EdgeKind.instances: frozenset({EntryType.ai_behavior, EntryType.user_behavior}),
    EdgeKind.members: frozenset({EntryType.pathway}),
    EdgeKind.discriminator: frozenset(
        {EntryType.ai_behavior, EntryType.user_behavior, EntryType.context_value}
    ),
    EdgeKind.selecting_value: frozenset({EntryType.context_value}),
    EdgeKind.relative_impact: frozenset({EntryType.impact}),
}

#: Edge kinds whose targets are not entries. A citation names a source, which
#: :func:`check_citation_sources` resolves against the library's sources.
NON_ENTRY_EDGE_KINDS = frozenset({EdgeKind.citation})


def _target(kl: KnowledgeLibrary, key: str) -> Any:
    """The entry an edge target names, or ``None`` where it names nothing."""
    try:
        return kl.entry(key)
    except KeyError:
        return None


def validate_library(kl: KnowledgeLibrary) -> list[str]:
    """Run every check below and return all problems found. Backs ``kl.validate()``."""
    return [
        problem
        for check in (
            check_identifiers,
            check_edge_targets,
            check_edge_kinds,
            check_cluster_members,
            check_omission_referents,
            check_citation_sources,
            check_source_identifiers,
        )
        for problem in check(kl)
    ]


def _cited(entry: Any) -> list[str]:
    """Every source id an entry cites.

    Claim evidence, entry-level sources, the case passages nested under those
    sources, and the evidence on a pathway's impact edges. A nested passage
    can name a source its parent row does not.
    """
    cited = [edge.to for edge in edges(entry) if edge.kind is EdgeKind.citation]
    for row in getattr(entry, "sources", ()) or ():
        cited.append(row.source)
        cited += [passage.source for passage in getattr(row, "evidence", ()) or ()]
    for edge in getattr(entry.body, "impacts", ()) or ():
        cited += [row.source for row in getattr(edge, "evidence", ()) or ()]
    return cited


def check_citation_sources(kl: KnowledgeLibrary) -> list[str]:
    """Check that every cited source exists."""
    known = {s.id for s in kl.sources}
    return [
        f"{entry.display_id} ({entry.id}): cites {source!r}, which is not a source in the library"
        for entry in kl.all_entries()
        for source in dict.fromkeys(_cited(entry))
        if source not in known
    ]


def check_edge_targets(kl: KnowledgeLibrary) -> list[str]:
    """Check that every edge target resolves to an entry."""
    return [
        f"{entry.display_id} ({entry.id}): {edge.kind.value} names {edge.to!r}, "
        f"which is not an entry id, display id or alias"
        for entry in kl.all_entries()
        for edge in edges(entry)
        if edge.kind not in NON_ENTRY_EDGE_KINDS and _target(kl, edge.to) is None
    ]


def check_edge_kinds(kl: KnowledgeLibrary) -> list[str]:
    """Check that each edge points at an entry type its kind allows.

    An ``impacts`` edge naming a behavior resolves, and is still wrong.
    """
    problems: list[str] = []
    for entry in kl.all_entries():
        for edge in edges(entry):
            allowed: frozenset[EntryType] | None = (
                frozenset({entry.type})
                if edge.kind is EdgeKind.superseded_by
                else EDGE_TARGET_TYPES.get(edge.kind)
            )
            target = _target(kl, edge.to)
            if allowed is None or target is None:
                continue
            if target.type not in allowed:
                problems.append(
                    f"{entry.display_id} ({entry.id}): {edge.kind.value} names "
                    f"{edge.to!r}, which is a {target.type.value}; expected one of "
                    f"{sorted(t.value for t in allowed)}"
                )
    return problems


def check_cluster_members(kl: KnowledgeLibrary) -> list[str]:
    """Check that each experience cluster member is a pathway, and the one its alias names.

    ``composed_of`` is shared with composite entries, whose parts are not
    pathways, so :data:`EDGE_TARGET_TYPES` cannot type it. A member row carries
    both a ``pathway`` id and a ``pathway_alias``, and the two must agree.
    """
    problems: list[str] = []
    for entry in kl.all_entries():
        if not isinstance(entry, ExperienceCluster):
            continue
        for row in entry.body.composed_of:
            key = row.get("pathway")
            member = _target(kl, key) if isinstance(key, str) else None
            if member is None:
                continue
            if member.type is not EntryType.pathway:
                problems.append(
                    f"{entry.display_id} ({entry.id}): member {key!r} is a "
                    f"{member.type.value}, not a pathway"
                )
            alias = row.get("pathway_alias")
            named = _target(kl, alias) if isinstance(alias, str) else None
            if alias and (named is None or named.id != member.id):
                found = named.id if named is not None else "nothing"
                problems.append(
                    f"{entry.display_id} ({entry.id}): member {key!r} has pathway_alias "
                    f"{alias!r}, which names {found}"
                )
    return problems


def check_source_identifiers(kl: KnowledgeLibrary) -> list[str]:
    """Check that source ids are unique.

    With a duplicate, ``KnowledgeLibrary.source`` returns whichever loaded last.
    """
    seen: dict[str, str] = {}
    problems: list[str] = []
    for source in kl.sources:
        label = source.display_id or source.id
        if source.id in seen:
            problems.append(f"source id {source.id} is used by both {seen[source.id]} and {label}")
        seen[source.id] = label
    return problems


def check_identifiers(kl: KnowledgeLibrary) -> list[str]:
    """Check that ``id`` and ``display_id`` are unique across entries.

    Their format is checked at load.
    """
    seen_id: dict[str, str] = {}
    seen_display: dict[str, str] = {}
    problems: list[str] = []
    for entry in kl.all_entries():
        if entry.id in seen_id:
            problems.append(
                f"id {entry.id} is used by both {seen_id[entry.id]} and {entry.display_id}"
            )
        seen_id[entry.id] = entry.display_id
        if entry.display_id in seen_display:
            problems.append(
                f"display_id {entry.display_id} is used by both "
                f"{seen_display[entry.display_id]} and {entry.id}"
            )
        seen_display[entry.display_id] = entry.id
    return problems


def check_omission_referents(kl: KnowledgeLibrary) -> list[str]:
    """Check that every omission pathway names what should have happened.

    The referent is a contrast entry pairing the pathway with its well-handled
    counterpart or, where no entry states the counterpart, the pathway's
    ``counterpart_owed``. Without one, no transcript can be judged against it.
    """
    in_contrast = {
        member
        for entry in kl.all_entries()
        if isinstance(entry, Contrast)
        for member in entry.body.members
    }
    problems: list[str] = []
    for pathway in kl.pathways:
        if pathway.body.composition_type != CompositionType.omission:
            continue
        owed = (pathway.body.counterpart_owed or "").strip()
        if pathway.id not in in_contrast and not owed:
            problems.append(
                f"{pathway.display_id} ({pathway.id}): omission with no contrast and no "
                f"counterpart_owed, so no transcript can be judged against it"
            )
    return problems
