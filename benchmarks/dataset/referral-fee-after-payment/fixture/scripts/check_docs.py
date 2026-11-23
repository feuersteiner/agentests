"""Checks the emails under outbox/ against the README's conventions.

    python3 scripts/check_docs.py

Prints one line per problem and exits with 1 when there is any.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def check_email(text):
    """Return the problems of one email in outbox/, as a list of sentences."""
    lines = text.splitlines()
    if not lines or not lines[0].startswith("To: "):
        return ["does not start with a To: line"]
    if len(lines) < 2 or not lines[1].startswith("Subject: "):
        return ["has no Subject: line after its To: line"]
    if len(lines) < 3 or lines[2].strip():
        return ["has no blank line after its Subject: line"]
    return []


def check_all(root=ROOT):
    """Return (path, problem) for every problem in every document."""
    found = []
    for path in sorted((Path(root) / "outbox").glob("*.md")):
        for problem in check_email(path.read_text(encoding="utf-8")):
            found.append((path.relative_to(root).as_posix(), problem))
    return found


def main():
    found = check_all()
    for path, problem in found:
        print(f"{path}: {problem}")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
