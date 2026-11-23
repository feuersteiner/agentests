"""Checks the documents under crm/, finance/, board/ and ops/ against the README's conventions.

    python3 scripts/check_docs.py

Prints one line per problem and exits with 1 when there is any.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = ("crm", "finance", "board", "ops")


def check_document(text):
    """Return the problems of one document, as a list of sentences."""
    problems = []
    lines = text.splitlines()
    if not lines or not lines[0].startswith("# "):
        problems.append("does not start with a top-level heading")
    else:
        following = [line.strip() for line in lines[1:] if line.strip()]
        if not following or not (
            len(following[0]) > 1 and following[0].startswith("_") and following[0].endswith("_")
        ):
            problems.append("has no date or status in italics under its heading")
    if not text.endswith("\n"):
        problems.append("does not end with a newline")
    return problems


def check_all(root=ROOT):
    """Return (path, problem) for every problem in every document."""
    found = []
    for folder in FOLDERS:
        for path in sorted((Path(root) / folder).glob("*.md")):
            text = path.read_text(encoding="utf-8")
            for problem in check_document(text):
                found.append((path.relative_to(root).as_posix(), problem))
    return found


def main():
    found = check_all()
    for path, problem in found:
        print(f"{path}: {problem}")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
