"""Check the sales documents against the conventions in README.md.

Run from the repository root:

    python3 scripts/check_docs.py

It prints one line per problem and exits with status 1 when it finds any.
"""

from __future__ import annotations

import sys
from pathlib import Path

CHECKED_FOLDERS = ("proposals", "notes")


def find_docs(root: Path) -> list[Path]:
    """Return the Markdown documents in the checked folders under `root`, sorted by path."""
    docs: list[Path] = []
    for folder in CHECKED_FOLDERS:
        docs.extend((root / folder).glob("*.md"))
    return sorted(docs)


def check_doc(folder: str, text: str) -> list[str]:
    """Return the problems found in the text of one document of `folder`."""
    problems: list[str] = []
    lines = text.splitlines()
    if not lines or not lines[0].startswith("# "):
        problems.append("line 1: the document must start with a level-1 heading")
    if folder == "proposals" and not any(line.startswith("_Valid until ") for line in lines):
        problems.append("a proposal needs a '_Valid until <date>_' line")
    return problems


def main(root: Path = Path(".")) -> int:
    found = 0
    for path in find_docs(root):
        folder = path.parent.name
        for problem in check_doc(folder, path.read_text(encoding="utf-8")):
            print(f"{path.relative_to(root)}: {problem}")
            found += 1
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
