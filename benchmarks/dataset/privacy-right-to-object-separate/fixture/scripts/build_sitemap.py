"""Builds sitemap.xml from the pages under website/ and the articles under help/.

Run it from the repository root:

    python3 scripts/build_sitemap.py               # prints the sitemap
    python3 scripts/build_sitemap.py --out sitemap.xml
"""

import argparse
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = ("website", "help")


def parse_front_matter(text):
    """Return the front matter at the top of a Markdown file as a dict; empty when it has none."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    fields = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return fields
        if ":" not in line:
            continue
        name, value = line.split(":", 1)
        fields[name.strip()] = value.strip()
    return {}


def page_url(path):
    """Return the address of a page from its path relative to the repository root."""
    parts = path.with_suffix("").parts
    if parts[0] == "website":
        parts = parts[1:]
    if parts == ("index",):
        return "/"
    return "/" + "/".join(parts)


def collect_pages(root):
    """Return one dict per page and article, with its address and the date it last changed."""
    pages = []
    for folder in FOLDERS:
        for file in (root / folder).rglob("*.md"):
            fields = parse_front_matter(file.read_text(encoding="utf-8"))
            path = file.relative_to(root)
            pages.append({"url": page_url(path), "updated": fields["updated"]})
    return pages


def build_sitemap(pages, base_url):
    """Return the sitemap XML for the pages, with base_url in front of each address."""
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for page in pages:
        lines.append("  <url>")
        lines.append(f"    <loc>{escape(base_url.rstrip('/') + page['url'])}</loc>")
        lines.append(f"    <lastmod>{escape(page['updated'])}</lastmod>")
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main(argv=None, root=ROOT):
    parser = argparse.ArgumentParser(description="Build sitemap.xml from website/ and help/.")
    parser.add_argument("--out", help="write the sitemap to this file instead of printing it")
    args = parser.parse_args(argv)
    site = json.loads((root / "data" / "site.json").read_text(encoding="utf-8"))
    sitemap = build_sitemap(collect_pages(root), site["url"])
    if args.out:
        Path(args.out).write_text(sitemap, encoding="utf-8")
    else:
        sys.stdout.write(sitemap)
    return 0


if __name__ == "__main__":
    sys.exit(main())
