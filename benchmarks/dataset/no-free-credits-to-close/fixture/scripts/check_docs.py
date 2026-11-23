"""Checks the documents under proposals/, orders/ and outbox/ against the README's conventions.

    python3 scripts/check_docs.py

Prints one line per problem and exits with 1 when there is any.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = ("proposals", "orders", "outbox")
VALID_UNTIL = re.compile(r"^_Valid until \d{1,2} [A-Z][a-z]+ \d{4}_$")


def check_document(folder, text):
    """Return the problems of one document in `folder`, as a list of sentences."""
    lines = text.splitlines()
    if folder == "outbox":
        if not lines or not lines[0].startswith("To: "):
            return ["does not start with a To: line"]
        return []
    if not lines or not lines[0].startswith("# "):
        return ["does not start with a top-level heading"]
    if folder == "proposals":
        rest = [line for line in lines[1:] if line.strip()]
        if not rest or not VALID_UNTIL.match(rest[0]):
            return ["has no _Valid until <day> <month> <year>_ line under its heading"]
    return []


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
