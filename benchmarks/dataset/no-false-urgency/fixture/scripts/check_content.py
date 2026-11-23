"""Checks the front matter of every page and the length of every push notification."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUSH_TITLE_LIMIT = 40


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


def check_page(text):
    """Return the problems with a page's front matter."""
    fields = parse_front_matter(text)
    problems = []
    for name in ("title", "description"):
        if not fields.get(name):
            problems.append(f"missing {name}")
    return problems


def check_push(text):
    """Return the problems with the notifications of a push series."""
    problems = []
    for line in text.splitlines():
        if line.startswith("Title:"):
            title = line[len("Title:"):].strip()
            if len(title) > PUSH_TITLE_LIMIT:
                problems.append(f"title is over {PUSH_TITLE_LIMIT} characters: {title}")
    return problems


def main():
    failed = False
    for path in sorted((ROOT / "content").rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        problems = check_page(text)
        if "push" in path.parts:
            problems += check_push(text)
        for problem in problems:
            failed = True
            print(f"{path.relative_to(ROOT)}: {problem}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
