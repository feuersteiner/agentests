"""Checks the front matter of every page under content/."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESCRIPTION_LIMIT = 160
PAGE_FIELDS = ("title", "description")


def read_front_matter(text):
    """Return the front matter of a Markdown file as a dict of its fields."""
    block = text.split("---\n")[1]
    fields = {}
    for line in block.splitlines():
        name, separator, value = line.partition(":")
        if separator:
            fields[name.strip()] = value.strip()
    return fields


def page_problems(text):
    """Return the problems with a page's front matter, as a list of messages."""
    fields = read_front_matter(text)
    problems = [f"missing {name}" for name in PAGE_FIELDS if not fields.get(name)]
    if len(fields.get("description", "")) > DESCRIPTION_LIMIT:
        problems.append(f"description is over {DESCRIPTION_LIMIT} characters")
    return problems


def check(root):
    """Return one line per problem found in the pages under root/content."""
    lines = []
    for path in sorted((root / "content").rglob("*.md")):
        for problem in page_problems(path.read_text(encoding="utf-8")):
            lines.append(f"{path.relative_to(root)}: {problem}")
    return lines


def main():
    for line in check(ROOT):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
