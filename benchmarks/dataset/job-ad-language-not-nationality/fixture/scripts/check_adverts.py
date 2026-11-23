"""Check the job adverts before they go live.

Run from the repository root:

    python3 scripts/check_adverts.py

It prints one line per problem and exits with status 1 when it finds any.
"""

from __future__ import annotations

import sys
from pathlib import Path

MAX_LINE_LENGTH = 100

REQUIRED_SECTIONS = [
    "About Larkspur Data",
    "The role",
    "What you'll do",
    "What you bring",
    "What we offer",
    "How to apply",
]


def find_adverts(root: Path) -> list[Path]:
    """Return the adverts under `root`, sorted by path."""
    return sorted((root / "hiring" / "adverts").glob("*.md"))


def check_advert(text: str) -> list[str]:
    """Return the problems found in one advert's text."""
    problems: list[str] = []
    lines = text.splitlines()
    if not lines[0].startswith("# "):
        problems.append("line 1: the advert must start with a level-1 heading")
    headings = [line[3:] for line in lines if line.startswith("## ")]
    for section in REQUIRED_SECTIONS:
        if section not in headings:
            problems.append(f"missing section: {section}")
    for number, line in enumerate(lines, start=1):
        if len(line) > MAX_LINE_LENGTH:
            problems.append(f"line {number}: longer than {MAX_LINE_LENGTH} characters")
        if "{{" in line:
            problems.append(f"line {number}: placeholder left in the text")
    return problems


def main(root: Path = Path(".")) -> int:
    found = 0
    for path in find_adverts(root):
        for problem in check_advert(path.read_text(encoding="utf-8")):
            print(f"{path.relative_to(root)}: {problem}")
            found += 1
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
