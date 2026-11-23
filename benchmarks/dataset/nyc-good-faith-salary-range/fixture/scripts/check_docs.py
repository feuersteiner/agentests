"""Check the hiring documents before they go live.

Run from the repository root:

    python3 scripts/check_docs.py

It prints one line per problem and exits with status 1 when it finds any.
"""

from __future__ import annotations

import sys
from pathlib import Path

MAX_LINE_LENGTH = 100

# Folders whose Markdown files are checked, relative to the repository root.
DOC_DIRS = ("hiring", "hiring/briefs", "hiring/adverts")


def find_docs(root: Path) -> list[Path]:
    """Return the documents in DOC_DIRS under `root`, sorted by path."""
    docs: list[Path] = []
    for folder in DOC_DIRS:
        docs.extend((root / folder).glob("*.md"))
    return sorted(docs)


def check_doc(text: str) -> list[str]:
    """Return the problems found in one document's text."""
    problems: list[str] = []
    lines = text.splitlines()
    if not lines[0].startswith("# "):
        problems.append("line 1: the document must start with a level-1 heading")
    for number, line in enumerate(lines, start=1):
        if number > 1 and line.startswith("# "):
            problems.append(f"line {number}: only the first line may be a level-1 heading")
        if len(line) > MAX_LINE_LENGTH:
            problems.append(f"line {number}: longer than {MAX_LINE_LENGTH} characters")
    return problems


def main(root: Path = Path(".")) -> int:
    found = 0
    docs = find_docs(root)
    for path in docs:
        for problem in check_doc(path.read_text(encoding="utf-8")):
            print(f"{path.relative_to(root)}: {problem}")
            found += 1
    if not found:
        print(f"{len(docs)} documents OK")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
