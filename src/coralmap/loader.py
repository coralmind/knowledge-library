"""Loading a Knowledge Library: YAML on disk to schema-validated, immutable models.

``load()`` reads, in order of precedence, an explicit path, the directory named
by ``CORALMIND_KL_PATH``, or the entries bundled in the installed wheel. Every
file is validated against its model, and any failure raises
:class:`LibraryParseError` listing every failing file. Graph integrity, such as
an edge naming an entry that does not exist, is checked separately by
:meth:`KnowledgeLibrary.validate`.

Loads are cached per resolved path for the life of the process. Call
:func:`clear_cache` to re-read a working copy after editing it.
"""

from __future__ import annotations

import functools
import hashlib
import json
import os
from collections.abc import Iterator, Mapping
from pathlib import Path
from types import MappingProxyType
from typing import Any, cast

import yaml
from pydantic import ValidationError

import coralmap
from coralmap.models import (
    ENTRY_MODELS,
    AiBehavior,
    Entry,
    Impact,
    Pathway,
    Source,
    UserBehavior,
)
from coralmap.query import EntryCollection, PathwayCollection, PathwayView
from coralmap.vocabularies import EntryType

#: Environment variable that points ``load()`` at a working copy instead of
#: the entries bundled in the wheel.
PATH_ENV_VAR = "CORALMIND_KL_PATH"

#: Directory inside the installed package holding the force-included content.
#: `pyproject.toml` maps repo-root `entries` to `coralmap/_bundled/entries`.
BUNDLE_DIR = "_bundled"


def _resolve_source(path: str | Path | None) -> Path:
    """The directory to load from: explicit argument, then env var, then bundle.

    Returns a directory holding an ``entries/`` subdirectory.
    """
    if path is not None:
        return _checked(Path(path), "the path argument")
    configured = os.environ.get(PATH_ENV_VAR)
    if configured:
        return _checked(Path(configured), f"${PATH_ENV_VAR}")
    return _checked(_bundled_dir(), "the packaged bundle")


def _bundled_dir() -> Path:
    """The content shipped with this copy of the package.

    A wheel install has ``_bundled/`` beside the package modules. An editable
    install imports from ``src/coralmap``, which has none, so it reads the
    checkout's own ``entries/``. Never another installation's copy.
    """
    package = Path(__file__).resolve().parent
    bundled = package / BUNDLE_DIR
    if (bundled / "entries").is_dir():
        return bundled
    checkout = package.parent.parent
    if package.parent.name == "src" and (checkout / "entries").is_dir():
        return checkout
    return bundled


def _checked(candidate: Path, origin: str) -> Path:
    """``candidate`` if it holds a library, otherwise a message naming ``origin``."""
    if not candidate.is_dir():
        raise FileNotFoundError(f"{origin} names {candidate}, which is not a directory")
    if not (candidate / "entries").is_dir():
        raise FileNotFoundError(f"{origin} names {candidate}, which has no entries/ directory")
    return candidate


#: Directory name to the entry type it holds. Mirrors `DIRECTORIES` in
#: tests/entries/test_files.py.
DIRECTORIES: dict[str, EntryType] = {
    "ai_behaviors": EntryType.ai_behavior,
    "user_behaviors": EntryType.user_behavior,
    "pathways": EntryType.pathway,
    "impacts": EntryType.impact,
    "mechanisms": EntryType.mechanism,
    "person_context": EntryType.context,
    "context_dimensions": EntryType.context_dimension,
    "context_values": EntryType.context_value,
    "experience_clusters": EntryType.experience_cluster,
    "operator_actions": EntryType.operator_action,
    "contrasts": EntryType.contrast,
    "divergences": EntryType.divergence,
}


class LibraryParseError(Exception):
    """One or more entry files do not conform to their model. Carries every problem."""

    def __init__(self, problems: list[str]) -> None:
        self.problems = tuple(problems)
        count = len(problems)
        noun = "entry" if count == 1 else "entries"
        super().__init__(f"{count} {noun} did not validate:\n  " + "\n  ".join(problems))


def _problem(path: Path, error: Exception) -> str:
    """One line per failing field, prefixed with the file it came from."""
    if isinstance(error, ValidationError):
        return "\n  ".join(
            f"{path.parent.name}/{path.name}: "
            f"{'.'.join(str(part) for part in item['loc'])}: {item['msg']}"
            for item in error.errors()
        )
    return f"{path.parent.name}/{path.name}: {type(error).__name__}: {error}"


#: The directory of source entries. A source is not an :class:`EntryType`: it
#: makes no claim of its own and is loaded into its own collection.
SOURCE_DIR = "sources"


def _walk(root: Path) -> Iterator[tuple[EntryType, Path]]:
    """Every entry file under ``root``, in authored order within each directory."""
    for name, entry_type in DIRECTORIES.items():
        for path in sorted((root / "entries" / name).glob("*.yaml")):
            yield entry_type, path


def _load_entries(
    root: Path,
) -> tuple[dict[EntryType, tuple[Entry[Any], ...]], tuple[Source, ...]]:
    """Parse every entry and source file under ``root`` into its model.

    Collects failures across the whole tree before raising.
    """
    found: dict[EntryType, list[Entry[Any]]] = {entry_type: [] for entry_type in EntryType}
    problems: list[str] = []
    for entry_type, path in _walk(root):
        try:
            raw = yaml.safe_load(path.read_text(encoding="utf-8"))
            found[entry_type].append(ENTRY_MODELS[entry_type].model_validate(raw))
        except (ValidationError, yaml.YAMLError, OSError) as error:
            problems.append(_problem(path, error))
    sources: list[Source] = []
    for path in sorted((root / "entries" / SOURCE_DIR).glob("*.yaml")):
        try:
            sources.append(Source.model_validate(yaml.safe_load(path.read_text(encoding="utf-8"))))
        except (ValidationError, yaml.YAMLError, OSError) as error:
            problems.append(_problem(path, error))
    if problems:
        raise LibraryParseError(problems)
    return (
        {entry_type: tuple(entries) for entry_type, entries in found.items()},
        tuple(sorted(sources, key=lambda source: source.id)),
    )


def parse_problems(root: str | Path | None = None) -> list[str]:
    """Every parse problem under ``root``, as strings. Empty means clean.

    The non-raising counterpart of :func:`load`, for finding what to fix.
    """
    try:
        _load_entries(_resolve_source(root))
    except LibraryParseError as error:
        return list(error.problems)
    return []


class KnowledgeLibrary:
    """An immutable, schema-validated snapshot of the Knowledge Library.

    Obtain one from :func:`load`; constructing it directly skips validation.
    """

    def __init__(
        self,
        entries: Mapping[EntryType, tuple[Entry[Any], ...]],
        *,
        sources: tuple[Source, ...] = (),
    ) -> None:
        self._entries = MappingProxyType(dict(entries))
        self._sources = sources
        self._sources_by_id = MappingProxyType({s.id: s for s in sources})
        by_key: dict[str, Entry[Any]] = {}
        for entry in self.all_entries():
            by_key[entry.id] = entry
            by_key[entry.display_id] = entry
        # An alias never shadows an id or display id, and the first entry to claim one keeps it.
        for entry in self.all_entries():
            for alias in entry.aliases:
                by_key.setdefault(alias, entry)
        self._by_key = MappingProxyType(by_key)

    def _one(self, key: str, expected: EntryType) -> Entry[Any]:
        """The entry ``key`` names, if it is of type ``expected``."""
        found = self._by_key.get(key)
        if found is None or found.type is not expected:
            raise KeyError(f"no {expected.value} with id, display_id or alias {key!r}")
        return found

    @property
    def version(self) -> str:
        """The package version this library shipped in; identifies the release.

        Pairs with :attr:`digest`, which identifies the content. When loading a
        working copy through ``CORALMIND_KL_PATH`` this is still the installed
        package's version, so cite the digest.
        """
        return coralmap.__version__

    @functools.cached_property
    def digest(self) -> str:
        """Content hash over every entry and source, in sorted id order.

        Computed from ``model_dump`` rather than file bytes, so it does not
        depend on where the library lives, how files are named, or directory
        order. Internal ``_``-prefixed keys are included.
        """
        hasher = hashlib.sha256()
        for entry in sorted(self.all_entries(), key=lambda e: e.id):
            payload = json.dumps(
                entry.model_dump(mode="json", exclude_none=True),
                sort_keys=True,
                separators=(",", ":"),
                default=str,
            )
            hasher.update(payload.encode("utf-8"))
            hasher.update(b"\x00")
        for cited in sorted(self._sources, key=lambda s: s.id):
            payload = json.dumps(
                cited.model_dump(mode="json", exclude_none=True),
                sort_keys=True,
                separators=(",", ":"),
                default=str,
            )
            hasher.update(b"source:")
            hasher.update(payload.encode("utf-8"))
            hasher.update(b"\x00")
        return f"sha256:{hasher.hexdigest()[:16]}"

    @property
    def pathways(self) -> PathwayCollection:
        """All pathways, as a filterable and traversable collection."""
        return PathwayCollection(
            cast(tuple[Pathway, ...], self._entries[EntryType.pathway]),
            model=Pathway,
            library=self,
        )

    @property
    def behaviors(self) -> EntryCollection[AiBehavior]:
        """All AI behaviors."""
        return EntryCollection(
            cast(tuple[AiBehavior, ...], self._entries[EntryType.ai_behavior]),
            model=AiBehavior,
            library=self,
        )

    @property
    def user_behaviors(self) -> EntryCollection[UserBehavior]:
        """All user behaviors."""
        return EntryCollection(
            cast(tuple[UserBehavior, ...], self._entries[EntryType.user_behavior]),
            model=UserBehavior,
            library=self,
        )

    @property
    def impacts(self) -> EntryCollection[Impact]:
        """All impacts."""
        return EntryCollection(
            cast(tuple[Impact, ...], self._entries[EntryType.impact]),
            model=Impact,
            library=self,
        )

    def pathway(self, display_id: str) -> PathwayView:
        """Return one pathway by id, display id or alias, e.g. ``"Pathway-5"``.

        The view resolves edges to entries, so ``.observations`` yields
        behavior objects rather than id strings.

        Raises:
            KeyError: if no pathway matches.
        """
        found = self._one(display_id, EntryType.pathway)
        assert isinstance(found, Pathway)
        return PathwayView(found, library=self)

    def behavior(self, display_id: str) -> AiBehavior:
        """Return one AI behavior by id, display id or alias, e.g. ``"AiBehavior-12"``.

        Raises:
            KeyError: if no AI behavior matches.
        """
        found = self._one(display_id, EntryType.ai_behavior)
        assert isinstance(found, AiBehavior)
        return found

    def impact(self, display_id: str) -> Impact:
        """Return one impact by id, display id or alias, e.g. ``"Impact-12"``.

        Raises:
            KeyError: if no impact matches.
        """
        found = self._one(display_id, EntryType.impact)
        assert isinstance(found, Impact)
        return found

    def entry(self, key: str) -> Entry[Any]:
        """Return any entry by ``id``, ``display_id`` or alias.

        An id or display id wins over another entry's alias.

        Raises:
            KeyError: if the key matches no entry.
        """
        found = self._by_key.get(key)
        if found is None:
            raise KeyError(f"no entry with id, display_id or alias {key!r}")
        return found

    @property
    def sources(self) -> tuple[Source, ...]:
        """Every cited work, in id order. Not entries, so not in :meth:`all_entries`."""
        return self._sources

    def source(self, source_id: str) -> Source:
        """The source a citation names, by its ``kl-`` id.

        Raises:
            KeyError: if no source has that id.
        """
        found = self._sources_by_id.get(source_id)
        if found is None:
            raise KeyError(f"no source with id {source_id!r}")
        return found

    def all_entries(self) -> tuple[Entry[Any], ...]:
        """Every entry, in type then authored order."""
        return tuple(entry for group in self._entries.values() for entry in group)

    def validate(self) -> list[str]:
        """Check cross-reference integrity; return every problem found. Empty means valid.

        Schema conformance is checked by :func:`load`. This checks what needs
        the whole library: edge targets resolve and have the right type,
        identifiers are unique, and citations name existing sources.
        """
        from coralmap.validate import validate_library

        return validate_library(self)


@functools.cache
def _load_cached(source: Path) -> KnowledgeLibrary:
    """Keyed on the resolved path."""
    entries, sources = _load_entries(source)
    return KnowledgeLibrary(entries, sources=sources)


def load(path: str | Path | None = None) -> KnowledgeLibrary:
    """Load a Knowledge Library and validate every entry against its schema.

    Args:
        path: Directory holding ``entries/``. Falls back to the
            ``CORALMIND_KL_PATH`` environment variable, then to the entries
            bundled in the installed package.

    Returns:
        An immutable snapshot, cached per resolved path. Call
        :meth:`KnowledgeLibrary.validate` to check cross-references.

    Raises:
        FileNotFoundError: if the path given or configured holds no ``entries/``.
        LibraryParseError: if any entry or source does not conform to its schema.
    """
    return _load_cached(_resolve_source(path).resolve())


def clear_cache() -> None:
    """Drop the load cache, so the next :func:`load` re-reads from disk."""
    _load_cached.cache_clear()
