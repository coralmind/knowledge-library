"""Models for the authored catalog, and the one import path for all of them.

The classes are grouped by ``layer``, meaning what kind of thing an entry
asserts, with one module per layer. Each module holds a slot's body and the
entry class that carries it. This module re-exports them all, so ``from coralmap.models
import X`` reaches any of them and the grouping stays an implementation detail:

    ``_base``           the machinery every layer uses
    ``_evidence``       how any entry is warranted and bounded
    ``_entry``          the shared entry envelope
    ``_observations``   observation
    ``_judgments``      judgment
    ``_contexts``       context
    ``_processes``      process, operator
    ``_sources``        provenance
    ``_derived``        what a pathway asserts without storing it
    ``_graph``          the relation graph

Three conventions the models encode. Any key beginning with ``_`` is internal
and is stripped by ``public_fields()``; models accept undeclared underscore
fields without declaring each one. Deprecated entries are exempt from the
grounding requirements (``claims[]``, ``standing``), since retiring an entry is
not a grounding failure. A field declared with ``contract()`` ships to
consumers; :meth:`Base.contract_fields` returns those fields from an instance.
A marked field is a promise to a consumer and an unmarked one is free to change.
"""

from __future__ import annotations

from typing import Any

from coralmap.models._base import (
    CONTRACT_KEY,
    Base,
    KlId,
    contract,
    contract_validator,
)
from coralmap.models._contexts import (
    Bounds,
    ContextDimension,
    ContextDimensionBody,
    ContextValue,
    ContextValueBody,
    PersonContext,
    PersonContextBody,
)
from coralmap.models._derived import (
    detection_window,
    exclusive_pair,
    holds_for_test_case,
    observations,
    preconditions,
    sign,
)
from coralmap.models._entry import CompositionRow, Entry
from coralmap.models._evidence import (
    CasePassage,
    Claim,
    ClaimEvidence,
    Contested,
    DistinguishFrom,
    EntrySource,
    Lifecycle,
    Measurement,
    StandingBlock,
)
from coralmap.models._graph import Edge, edges
from coralmap.models._judgments import (
    BehaviorPart,
    ContextPart,
    Contrast,
    ContrastBody,
    Divergence,
    DivergenceBody,
    DivergenceMember,
    ExperienceCluster,
    ExperienceClusterBody,
    Impact,
    ImpactBody,
    Part,
    Pathway,
    PathwayBody,
    PathwayImpactEdge,
    RelativeStrength,
)
from coralmap.models._observations import (
    AiBehavior,
    AiBehaviorBody,
    BehaviorBody,
    Irreversibility,
    UserBehavior,
    UserBehaviorBody,
)
from coralmap.models._processes import (
    Mechanism,
    MechanismBody,
    OperatorAction,
    OperatorActionBody,
)
from coralmap.models._sources import Source, SourceBody, citation_counts
from coralmap.vocabularies import EntryType

#: Entry type to the model that validates it: the authored slots, which are
#: what "an entry" means. A source is not here: it carries no claims and no
#: standing, so a rule written over entries must not run against one.
ENTRY_MODELS: dict[EntryType, type[Entry[Any]]] = {
    EntryType.ai_behavior: AiBehavior,
    EntryType.user_behavior: UserBehavior,
    EntryType.impact: Impact,
    EntryType.pathway: Pathway,
    EntryType.mechanism: Mechanism,
    EntryType.context: PersonContext,
    EntryType.context_dimension: ContextDimension,
    EntryType.context_value: ContextValue,
    EntryType.experience_cluster: ExperienceCluster,
    EntryType.operator_action: OperatorAction,
    EntryType.contrast: Contrast,
    EntryType.divergence: Divergence,
}


__all__ = [
    "CONTRACT_KEY",
    "ENTRY_MODELS",
    "AiBehavior",
    "AiBehaviorBody",
    "Base",
    "BehaviorBody",
    "BehaviorPart",
    "Bounds",
    "CasePassage",
    "Claim",
    "ClaimEvidence",
    "CompositionRow",
    "Contested",
    "ContextDimension",
    "ContextDimensionBody",
    "ContextPart",
    "ContextValue",
    "ContextValueBody",
    "Contrast",
    "ContrastBody",
    "DistinguishFrom",
    "Divergence",
    "DivergenceBody",
    "DivergenceMember",
    "Edge",
    "Entry",
    "EntrySource",
    "ExperienceCluster",
    "ExperienceClusterBody",
    "Impact",
    "ImpactBody",
    "Irreversibility",
    "KlId",
    "Lifecycle",
    "Measurement",
    "Mechanism",
    "MechanismBody",
    "OperatorAction",
    "OperatorActionBody",
    "Part",
    "Pathway",
    "PathwayBody",
    "PathwayImpactEdge",
    "PersonContext",
    "PersonContextBody",
    "RelativeStrength",
    "Source",
    "SourceBody",
    "StandingBlock",
    "UserBehavior",
    "UserBehaviorBody",
    "citation_counts",
    "contract",
    "contract_validator",
    "detection_window",
    "edges",
    "exclusive_pair",
    "holds_for_test_case",
    "observations",
    "preconditions",
    "sign",
]
