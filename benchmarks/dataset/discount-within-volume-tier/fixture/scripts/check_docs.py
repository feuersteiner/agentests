"""Checks the documents under proposals/, orders/ and outbox/ against the README's conventions.

    python3 scripts/check_docs.py

Prints one line per problem and exits with 1 when there is any.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUMMARY_ROWS = ("Customer", "Billing", "Annual credit purchase", "Amount payable")
DIVIDER = re.compile(r"^\|[\s:|-]+\|$")


def first_cells(text):
    """Return the first cell of every Markdown table row in `text`, divider rows left out."""
    cells = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("|") and not DIVIDER.match(line):
            cells.append(line.strip("|").split("|")[0].strip())
    return cells


def check_document(name, text):
    """Return the problems of a proposal or an order form."""
    problems = []
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines or not lines[0].startswith("# "):
        problems.append(f"{name}: does not start with a top-level heading")
    cells = first_cells(text)
    for row in SUMMARY_ROWS:
        if row not in cells:
            problems.append(f"{name}: summary table has no {row} row")
    return problems


def check_email(name, text):
    """Return the problems of an email in outbox/."""
    problems = []
    _, front_matter, _ = text.split("---\n", 2)
    fields = {}
    for line in front_matter.strip().splitlines():
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()
    for field in ("to", "subject"):
        if not fields.get(field):
            problems.append(f"{name}: front matter has no {field}")
    return problems


def check_repository(root=ROOT):
    """Return every problem of every document under proposals/, orders/ and outbox/."""
    root = Path(root)
    problems = []
    for folder in ("proposals", "orders"):
        for path in sorted((root / folder).glob("**/*.md")):
            name = path.relative_to(root).as_posix()
            problems += check_document(name, path.read_text(encoding="utf-8"))
    for path in sorted((root / "outbox").glob("**/*.md")):
        name = path.relative_to(root).as_posix()
        problems += check_email(name, path.read_text(encoding="utf-8"))
    return problems


def main():
    problems = check_repository()
    for problem in problems:
        print(problem)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
