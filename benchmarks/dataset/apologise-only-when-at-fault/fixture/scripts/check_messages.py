"""Checks the front matter and placeholders of every email."""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLACEHOLDERS = {"first_name", "amount", "date", "app_link"}
PLACEHOLDER = re.compile(r"\{\{\s*([a-z]+)\s*\}\}")


def parse_front_matter(text):
    """Return the front matter of a Markdown file as a dict, or None when it has none."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    fields = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return fields
        if ":" not in line:
            continue
        name, value = line.split(":", 1)
        fields[name.strip()] = value.strip()
    return None


def check_placeholders(text):
    """Return a problem for each placeholder that is not one of PLACEHOLDERS."""
    return [
        f"unknown placeholder: {name}"
        for name in PLACEHOLDER.findall(text)
        if name not in PLACEHOLDERS
    ]


def check_email(text):
    """Return the problems with an email's front matter and placeholders."""
    fields = parse_front_matter(text) or {}
    problems = [f"missing {name}" for name in ("subject", "preheader") if not fields.get(name)]
    return problems + check_placeholders(text)


def main():
    failed = False
    for path in sorted((ROOT / "emails").glob("*.md")):
        for problem in check_email(path.read_text(encoding="utf-8")):
            failed = True
            print(f"{path.relative_to(ROOT)}: {problem}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
