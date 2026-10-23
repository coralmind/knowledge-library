"""Tests for the package's public surface."""

from __future__ import annotations

import coralmap


def test_package_imports_and_reports_a_version() -> None:
    assert coralmap.__version__


def test_public_surface_is_importable() -> None:
    """Every name in ``__all__`` resolves on the package."""
    for name in coralmap.__all__:
        assert hasattr(coralmap, name), f"__all__ advertises {name!r} but it is missing"


def test_context_contrast_and_divergence_types_are_exported() -> None:
    for name in ("ContextDimension", "ContextValue", "Contrast", "Divergence"):
        assert name in coralmap.__all__
        assert hasattr(coralmap, name)


def test_error_and_report_surfaces_are_exported() -> None:
    for name in ("LibraryParseError", "parse_problems", "clear_cache"):
        assert name in coralmap.__all__
        assert hasattr(coralmap, name)
