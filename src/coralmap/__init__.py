"""The CoralMind Knowledge Library: harm pathways, AI behaviors and impacts.

Typical use::

    from coralmap import load

    kl = load()
    kl.version, kl.digest                        # release id + content hash
    kl.pathways.leading_to("Impact-12")
    kl.pathway("Pathway-5").observations
    kl.validate()

``kl.version`` is the package version and identifies the release.
``kl.digest`` is a content hash and identifies exactly which entries were
loaded. Record both when citing results.

The loaded snapshot is immutable, with one model class per entry type. A
field marked with :func:`contract` is what ``contract_fields()`` returns.
"""

from __future__ import annotations

from coralmap.loader import (
    KnowledgeLibrary,
    LibraryParseError,
    clear_cache,
    load,
    parse_problems,
)
from coralmap.models import (
    AiBehavior,
    ContextDimension,
    ContextValue,
    Contrast,
    Divergence,
    Edge,
    Entry,
    ExperienceCluster,
    Impact,
    Irreversibility,
    Mechanism,
    OperatorAction,
    Pathway,
    PersonContext,
    Source,
    UserBehavior,
    contract,
    contract_validator,
    edges,
)
from coralmap.query import EntryCollection, PathwayCollection, PathwayView

__all__ = [
    "AiBehavior",
    "ContextDimension",
    "ContextValue",
    "Contrast",
    "Divergence",
    "Edge",
    "Entry",
    "EntryCollection",
    "ExperienceCluster",
    "Impact",
    "Irreversibility",
    "KnowledgeLibrary",
    "LibraryParseError",
    "Mechanism",
    "OperatorAction",
    "Pathway",
    "PathwayCollection",
    "PathwayView",
    "PersonContext",
    "Source",
    "UserBehavior",
    "clear_cache",
    "contract",
    "contract_validator",
    "edges",
    "load",
    "parse_problems",
]

#: Distribution version, reported as ``kl.version``. Release Please updates it.
__version__ = "0.1.0"
