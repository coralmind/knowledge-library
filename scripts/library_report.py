#!/usr/bin/env python3
"""Print every problem with the library: parse failures, then graph failures.

Graph checks run only when every entry parses.

Usage::

    pixi run library-report
    pixi run library-report --path some/other/library
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from coralmap import loader


def main(argv: list[str] | None = None) -> int:
    description = __doc__.splitlines()[0] if __doc__ else None
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--path", type=Path, default=None, help="Library root to check.")
    args = parser.parse_args(argv)

    parse_problems = loader.parse_problems(args.path)
    if parse_problems:
        print(
            f"{len(parse_problems)} entr{'y' if len(parse_problems) == 1 else 'ies'} "
            f"did not parse:\n"
        )
        for problem in parse_problems:
            print(f"  {problem}")
        print("\nGraph checks skipped: the library could not be assembled.")
        return 1

    problems = loader.load(args.path).validate()
    if problems:
        print(f"{len(problems)} graph problem(s):\n")
        for problem in problems:
            print(f"  {problem}")
        return 1

    print("Library parses and validates.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
