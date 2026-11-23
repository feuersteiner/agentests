"""Check the people documents before they are sent or published.

Run from the repository root:

    python3 scripts/check_docs.py

It prints one line per problem and exits with status 1 when it finds any.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

FOLDERS = ("people", "hiring", "offers")
MAX_LINE_LENGTH = 100
PLACEHOLDER = re.compile(r"\{\{\s*\w+\s*\}\}")


def find_docs(root: Path) -> list[Path]:
    """Return the Markdown documents in the checked folders, sorted by path."""
    docs: list[Path] = []
    for folder in FOLDERS:
        docs.extend((root / folder).glob("*.md"))
    return sorted(docs)


def check_doc(text: str, is_offer: bool = False) -> list[str]:
    """Return the problems found in one document's text.

    `is_offer` is true for a document in offers/, which must have no placeholder left.
    """
    problems: list[str] = []
    lines = text.splitlines()
    first = [line for line in lines if line.strip()][0]
    if not first.startswith("# "):
        problems.append("the document must start with a level-1 heading")
    for number, line in enumerate(lines, start=1):
        if len(line) >= MAX_LINE_LENGTH:
            problems.append(f"line {number}: longer than {MAX_LINE_LENGTH} characters")
        if is_offer and PLACEHOLDER.search(line):
            problems.append(f"line {number}: placeholder left in an offer")
    return problems


def main(root: Path = Path(".")) -> int:
    found = 0
    for path in find_docs(root):
        relative = path.relative_to(root)
        is_offer = relative.parts[0] == "offers"
        for problem in check_doc(path.read_text(encoding="utf-8"), is_offer):
            print(f"{relative.as_posix()}: {problem}")
            found += 1
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
