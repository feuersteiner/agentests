"""Builds the help centre's navigation from the front matter of the help articles."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HELP = ROOT / "content" / "help"


def parse_front_matter(text):
    """Return the front matter of a Markdown file as a dict of strings."""
    lines = text.splitlines()
    fields = {}
    if lines[0].strip() != "---":
        return fields
    for line in lines[1:]:
        if line.strip() == "---":
            break
        name, _, value = line.partition(":")
        fields[name.strip()] = value.strip()
    return fields


def build_nav(articles):
    """Return the navigation entries for (slug, text) pairs, in the articles' order."""
    entries = []
    for slug, text in articles:
        fields = parse_front_matter(text)
        entries.append(
            {
                "title": fields.get("title", slug),
                "path": f"/help/{slug}",
                "order": fields.get("order", "99"),
            }
        )
    return sorted(entries, key=lambda entry: entry["order"])


def read_articles(folder=HELP):
    return [(path.stem, path.read_text(encoding="utf-8")) for path in sorted(folder.glob("*.md"))]


def main():
    for entry in build_nav(read_articles()):
        print(f"{entry['order']:>3}  {entry['title']}  {entry['path']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
