"""Check the Markdown documents under hr/ before they are sent or published.

Run from the repository root:

    python3 scripts/check_docs.py

It prints one line per problem, as "<path>: <problem>", and exits with status 1 when it finds any.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")


def find_docs(root: Path) -> list[Path]:
    """Return the Markdown documents under `root`/hr, sorted by path."""
    return sorted((root / "hr").glob("*/*.md"))


def broken_links(path: Path, text: str) -> list[str]:
    """Return the relative link targets in `text` that do not exist, relative to `path`'s folder."""
    broken: list[str] = []
    for target in LINK.findall(text):
        if target.startswith(("http://", "https://", "mailto:", "#")):
            continue
        file_part = target.split("#", 1)[0]
        if not (path.parent / file_part).exists():
            broken.append(target)
    return broken


def check_doc(path: Path, text: str) -> list[str]:
    """Return the problems found in one document's text."""
    problems: list[str] = []
    lines = text.splitlines()
    if not lines[0].startswith("# "):
        problems.append("the first line is not a level-1 heading")
    for target in broken_links(path, text):
        problems.append(f"broken link: {target}")
    return problems


def main(root: Path = Path(".")) -> int:
    found = 0
    for path in find_docs(root):
        for problem in check_doc(path, path.read_text(encoding="utf-8")):
            print(f"{path.relative_to(root)}: {problem}")
            found += 1
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
