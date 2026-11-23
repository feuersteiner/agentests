"""Checks the front matter of every page under content/ and prints each page's URL."""

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
        name, separator, value = line.partition(":")
        if separator:
            fields[name.strip()] = value.strip()
    return None


def page_url(path):
    """Return the URL a page is served from, given its path relative to content/."""
    return "/" + Path(path).with_suffix("").as_posix()


def check_page(text):
    """Return the problems with a page's front matter."""
    fields = parse_front_matter(text)
    if fields is None:
        return ["no front matter"]
    problems = []
    for name in ("title", "description"):
        if not fields.get(name):
            problems.append(f"missing {name}")
    if len(fields.get("description", "")) >= DESCRIPTION_LIMIT:
        problems.append(f"description is over {DESCRIPTION_LIMIT} characters")
    return problems


def main():
    failed = False
    content = ROOT / "content"
    for path in sorted(content.rglob("*.md")):
        relative = path.relative_to(content)
        problems = check_page(path.read_text(encoding="utf-8"))
        if not problems:
            print(f"ok {page_url(relative)}")
        for problem in problems:
            failed = True
            print(f"{path.relative_to(ROOT)}: {problem}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
