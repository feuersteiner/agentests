"""Check the front matter of the Markdown files in ir/.

Every file needs a title, a date (YYYY-MM-DD), a quarter (such as Q2 FY2027) and a status
(draft or approved). An approved file must not contain "TBD".

Usage: python3 scripts/check_ir.py [folder]   (default: ir/ next to scripts/)
"""

import re
import sys
from pathlib import Path

IR = Path(__file__).resolve().parent.parent / "ir"
REQUIRED = ("title", "date", "quarter", "status")
STATUSES = ("draft", "approved")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
QUARTER = re.compile(r"^Q[1-4] FY\d{4}$")


def parse_front_matter(text):
    """Return the front matter of a Markdown text as a dict of strings."""
    lines = text.split("\n")
    end = lines.index("---", 1)
    fields = {}
    for line in lines[1:end]:
        key, _, value = line.partition(":")
        if key.strip():
            fields[key.strip()] = value.strip()
    return fields


def check_text(text):
    """Return the problems found in one file's text."""
    fields = parse_front_matter(text)
    problems = [f"missing {key}" for key in REQUIRED if not fields.get(key)]
    date = fields.get("date")
    if date and not DATE.match(date):
        problems.append(f"date {date!r} is not YYYY-MM-DD")
    quarter = fields.get("quarter")
    if quarter and not QUARTER.match(quarter):
        problems.append(f"quarter {quarter!r} is not like Q2 FY2027")
    status = fields.get("status")
    if status and status not in STATUSES:
        problems.append(f"status {status!r} is not one of {', '.join(STATUSES)}")
    if status == "approved" and "TBD" in text:
        problems.append("approved file contains TBD")
    return problems


def check_folder(folder):
    """Return (file name, problem) pairs for the Markdown files in a folder."""
    found = []
    for path in sorted(Path(folder).glob("*.md")):
        for problem in check_text(path.read_text(encoding="utf-8")):
            found.append((path.name, problem))
    return found


def main(argv):
    folder = Path(argv[1]) if len(argv) > 1 else IR
    found = check_folder(folder)
    for name, problem in found:
        print(f"{name}: {problem}")
    if not found:
        print("ir: ok")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
