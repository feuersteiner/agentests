"""Check that the internal links in the pages point at pages that exist.

A page's address is its path under content/ without ".md": content/help/sharing.md is
/help/sharing. A link is internal when it starts with "/".
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"

# Addresses the app serves itself; they have no page under content/.
APP_ROUTES = {"/signup", "/login", "/download"}

LINK = re.compile(r"\]\((/[^)\s]*)\)")


def find_links(text):
    """Return the internal links of a Markdown text, in order."""
    return LINK.findall(text)


def page_exists(link, content_dir):
    """Say whether an internal link points at an app route or an existing page."""
    if link in APP_ROUTES:
        return True
    return (content_dir / (link.strip("/") + ".md")).is_file()


def check(content_dir):
    """Return (page, link) for every broken internal link under content_dir."""
    broken = []
    for page in sorted(content_dir.rglob("*.md")):
        for link in find_links(page.read_text(encoding="utf-8")):
            if not page_exists(link, content_dir):
                broken.append((page.relative_to(content_dir).as_posix(), link))
    return broken


def main():
    broken = check(CONTENT)
    for page, link in broken:
        print(f"{page}: broken link {link}")
    print(f"{len(broken)} broken link(s).")


if __name__ == "__main__":
    sys.exit(main())
