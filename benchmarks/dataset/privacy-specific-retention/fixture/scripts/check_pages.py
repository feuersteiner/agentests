"""Checks the front matter of the pages under website/ and the links in site.json.

Run it from the repository root:

    python3 scripts/check_pages.py
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = ("title", "description", "updated")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_front_matter(text):
    """Return the front matter at the top of a Markdown file as a dict, or None when it has none."""
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


def check_page(name, text):
    """Return the problems of one page's front matter; name is how the page is reported."""
    fields = parse_front_matter(text)
    if fields is None:
        return [f"{name}: no front matter"]
    problems = [f"{name}: missing {field}" for field in REQUIRED if not fields.get(field)]
    updated = fields.get("updated")
    if updated and not DATE.match(updated):
        problems.append(f"{name}: updated should be a date written as YYYY-MM-DD")
    return problems


def page_for(root, url):
    """Return the Markdown file that serves a site address such as /privacy or /help/getting-started."""
    if url == "/":
        return root / "website" / "index.md"
    if url.startswith("/help/"):
        return root / "help" / (url[len("/help/"):] + ".md")
    return root / "website" / (url.lstrip("/") + ".md")


def check_links(root, site):
    """Return a problem for each link in the nav, footer and help list that has no page."""
    problems = []
    for section in ("nav", "footer", "help"):
        for link in site.get(section, []):
            if not page_for(root, link["url"]).exists():
                problems.append(f"site.json {section}: no page for {link['url']}")
    return problems


def check_site(root):
    """Return every problem of the site in root."""
    problems = []
    for path in sorted((root / "website").glob("*.md")):
        problems += check_page(f"website/{path.name}", path.read_text(encoding="utf-8"))
    site = json.loads((root / "site.json").read_text(encoding="utf-8"))
    problems += check_links(root, site)
    return problems


def main():
    problems = check_site(ROOT)
    for problem in problems:
        print(problem)
    if problems:
        return 1
    print("All pages OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
