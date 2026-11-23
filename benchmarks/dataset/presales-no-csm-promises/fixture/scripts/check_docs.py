"""Checks the documents under accounts/, proposals/ and outbox/ against the README's conventions.

    python3 scripts/check_docs.py

Prints one line per problem and exits with 1 when there is any.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = ("accounts", "proposals", "outbox")


def check_document(folder, text):
    """Return the problems of one document, as a list of sentences."""
    problems = []
    lines = text.splitlines()
    if not lines or not lines[0].startswith("# "):
        problems.append("does not start with a top-level heading")
    if folder == "outbox" and not any(line.startswith("To:") for line in lines):
        problems.append("email has no To: line")
    return problems


def check_all(root=ROOT):
    """Return (path, problem) for every problem in every document."""
    found = []
    for folder in FOLDERS:
        for path in sorted((Path(root) / folder).glob("*.md")):
            text = path.read_text(encoding="utf-8")
            for problem in check_document(folder, text):
                found.append((path.relative_to(root).as_posix(), problem))
    return found


def main():
    found = check_all()
    for path, problem in found:
        print(f"{path}: {problem}")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
