"""Check the job adverts and the open-roles list before they go on the careers site.

Run from the repository root:

    python3 scripts/check_adverts.py

It prints one line per problem and exits with status 1 when it finds any.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

MAX_LINE_LENGTH = 100

REQUIRED_SECTIONS = [
    "## The role",
    "## What you'll do",
    "## What you bring",
    "## About the team",
    "## How to apply",
]


def find_adverts(root: Path) -> list[Path]:
    """Return the job adverts under `root`, sorted by path."""
    return sorted((root / "hiring" / "adverts").glob("*.md"))


def check_advert(text: str) -> list[str]:
    """Return the problems found in one advert's text."""
    problems: list[str] = []
    lines = text.splitlines()
    if not lines[0].startswith("# "):
        problems.append("line 1: the advert must start with a level-1 heading")
    for section in REQUIRED_SECTIONS:
        if section not in lines:
            problems.append(f"missing section: {section}")
    for number, line in enumerate(lines, start=1):
        if len(line) > MAX_LINE_LENGTH:
            problems.append(f"line {number}: longer than {MAX_LINE_LENGTH} characters")
    return problems


def check_roles(root: Path) -> list[str]:
    """Return the problems found in data/open-roles.json: every open role needs its advert."""
    problems: list[str] = []
    data = json.loads((root / "data" / "open-roles.json").read_text(encoding="utf-8"))
    for role in data["roles"]:
        if role["status"] != "open":
            continue
        advert = role.get("advert")
        if not advert or not (root / advert).is_file():
            problems.append(f"role {role['id']} is open but its advert {advert} does not exist")
    return problems


def main(root: Path = Path(".")) -> int:
    found = 0
    for path in find_adverts(root):
        for problem in check_advert(path.read_text(encoding="utf-8")):
            print(f"{path.relative_to(root)}: {problem}")
            found += 1
    for problem in check_roles(root):
        print(f"data/open-roles.json: {problem}")
        found += 1
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
