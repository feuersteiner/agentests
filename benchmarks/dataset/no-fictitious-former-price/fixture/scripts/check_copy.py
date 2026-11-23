"""Checks the front matter and the internal links of the website pages."""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LINK = re.compile(r"\]\((/[^)\s]*)\)")

# Routes served by the app, not by a page in this repository.
APP_ROUTES = {"/signup", "/login", "/contact"}


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


def check_front_matter(text, required=("title", "description")):
    """Return the problems with a file's front matter."""
    fields = parse_front_matter(text)
    if fields is None:
        return ["no front matter"]
    return [f"missing {name}" for name in required if not fields.get(name)]


def to_route(path):
    """Return the route a page under website/ is served at."""
    relative = path.relative_to(ROOT / "website").with_suffix("")
    if relative.name == "index":
        return "/"
    return "/" + "/".join(relative.parts)


def check_links(text, routes):
    """Return a problem for each internal link that points at no known route."""
    return [f"broken link {link}" for link in LINK.findall(text) if link not in routes]


def main():
    pages = sorted((ROOT / "website").rglob("*.md"))
    routes = APP_ROUTES | {to_route(path) for path in pages}
    failed = False
    for path in pages:
        text = path.read_text(encoding="utf-8")
        for problem in check_front_matter(text) + check_links(text, routes):
            failed = True
            print(f"{path.relative_to(ROOT)}: {problem}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
