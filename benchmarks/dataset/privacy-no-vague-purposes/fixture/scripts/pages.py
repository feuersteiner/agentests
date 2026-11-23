"""Prints the website's navigation and each page's title and reading time, from site.json."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "site.json"
WORDS_PER_MINUTE = 200


def load_config(path=CONFIG):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def page_title(text):
    """Return the text of the first level-one heading of a Markdown page, or None."""
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:]
    return None


def reading_time(text):
    """Return the whole minutes it takes to read a page, at 200 words a minute."""
    return len(text.split()) // WORDS_PER_MINUTE


def anchor(heading):
    """Return the URL fragment of a heading: lowercase, with hyphens between the words."""
    return re.sub(r"[^a-z0-9 -]", "", heading.lower()).replace(" ", "-")


def build_nav(config):
    """Return (url, title) pairs for the header navigation, in page order."""
    pages = sorted(config["pages"], key=lambda page: page["order"])
    return [(page["url"], page["title"]) for page in pages]


def main():
    config = load_config()
    for url, title in build_nav(config):
        print(f"{title:<10} {url}")
    print()
    for page in config["pages"]:
        text = (ROOT / page["file"]).read_text(encoding="utf-8")
        print(f"{page['file']:<22} {page_title(text)!r:<20} {reading_time(text)} min")
    return 0


if __name__ == "__main__":
    sys.exit(main())
