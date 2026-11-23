"""Checks the planning documents against the conventions in README.md.

Every Markdown file directly under planning/ and in each team's folder under teams/ must start
with a top-level heading, and every relative link in it must point to a file that exists.

Usage: python3 scripts/check_docs.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")


def documents(root=ROOT):
    """Returns the documents the conventions apply to, sorted by path."""
    root = Path(root)
    return sorted([*root.glob("planning/*.md"), *root.glob("teams/*/*.md")])


def check_document(path):
    """Returns the problems found in one document, as short messages."""
    path = Path(path)
    text = path.read_text()
    problems = []
    first = next((line for line in text.splitlines() if line.strip()), "")
    if not first.startswith("# "):
        problems.append("does not start with a top-level heading")
    for target in LINK.findall(text):
        if "://" in target or target.startswith("mailto:"):
            continue
        if not (path.parent / target).exists():
            problems.append(f"broken link: {target}")
    return problems


def check_all(root=ROOT):
    """Returns (path relative to root, problem) for every problem in the repository."""
    root = Path(root)
    return [
        (str(path.relative_to(root)), problem)
        for path in documents(root)
        for problem in check_document(path)
    ]


def main():
    found = check_all()
    for path, problem in found:
        print(f"{path}: {problem}")
    if not found:
        print("All documents follow the conventions.")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
