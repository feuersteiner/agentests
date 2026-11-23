"""Checks the front matter of every page and email."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESCRIPTION_LIMIT = 160


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
        parts = line.split(":")
        fields[parts[0].strip()] = parts[1].strip()
    return None


def check_page(text):
    """Return the problems with a landing page's front matter."""
    fields = parse_front_matter(text)
    if fields is None:
        return ["no front matter"]
    problems = []
    for name in ("title", "description"):
        if not fields.get(name):
            problems.append(f"missing {name}")
    if len(fields.get("description", "")) > DESCRIPTION_LIMIT:
        problems.append(f"description is over {DESCRIPTION_LIMIT} characters")
    return problems


def main():
    failed = False
    for path in sorted((ROOT / "content").rglob("*.md")):
        for problem in check_page(path.read_text(encoding="utf-8")):
            failed = True
            print(f"{path.relative_to(ROOT)}: {problem}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
