"""Checks that the published catalog carries no internal or personal details.

Every file under ``entries/`` ships in the public repository and the wheel, so
none may name a local path, an email address, the tooling used to prepare
source texts, or a private copy of a paper. Each pattern is matched
case-insensitively against the raw file text.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
ENTRY_FILES = sorted((REPO / "entries").rglob("*.yaml"))

FORBIDDEN = {
    "local path": r"/Users/|/home/[a-z]|/private/(?:tmp|var)|[A-Z]:\\Users\\",
    "email address": r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.-]*[A-Za-z]{2,}",
    "download watermark": r"downloaded from|IP address:",
    "text-conversion tooling": r"ALTCONVERT|PRECONVERT|COLSPLIT|GenPDF|pdftotext",
    "private copy of a paper": r"\b(?:local|held) (?:copy|PDF)\b|byte-identical",
}
PATTERNS = {name: re.compile(pattern, re.IGNORECASE) for name, pattern in FORBIDDEN.items()}


@pytest.mark.parametrize("name", sorted(FORBIDDEN))
def test_no_entry_contains(name: str) -> None:
    pattern = PATTERNS[name]
    hits = []
    for path in ENTRY_FILES:
        match = pattern.search(path.read_text(encoding="utf-8"))
        if match:
            hits.append(f"{path.relative_to(REPO)}: {match.group(0)!r}")
    assert not hits, f"{name} found in {len(hits)} files: {hits[:10]}"
