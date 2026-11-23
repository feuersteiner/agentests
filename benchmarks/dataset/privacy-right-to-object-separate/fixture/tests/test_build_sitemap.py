import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import build_sitemap  # noqa: E402

PAGE = "---\ntitle: Pricing\ndescription: Plans and prices.\nupdated: 2026-10-12\n---\n\n# Pricing\n"


def write(root, path, text):
    file = root / path
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(text, encoding="utf-8")


def write_site(root):
    write(root, "data/site.json", json.dumps({"url": "https://tessellate.example"}))


def test_parse_front_matter_reads_fields():
    assert build_sitemap.parse_front_matter(PAGE) == {
        "title": "Pricing",
        "description": "Plans and prices.",
        "updated": "2026-10-12",
    }


def test_parse_front_matter_keeps_colons_in_values():
    text = "---\ntitle: Shifts: the basics\n---\n"
    assert build_sitemap.parse_front_matter(text) == {"title": "Shifts: the basics"}


def test_parse_front_matter_without_front_matter():
    assert build_sitemap.parse_front_matter("# Pricing\n") == {}


def test_page_url():
    assert build_sitemap.page_url(Path("website/pricing.md")) == "/pricing"
    assert build_sitemap.page_url(Path("website/index.md")) == "/"
    assert build_sitemap.page_url(Path("help/billing.md")) == "/help/billing"


def test_collect_pages(tmp_path):
    write(tmp_path, "website/pricing.md", PAGE)
    write(tmp_path, "help/billing.md", PAGE.replace("2026-10-12", "2026-09-01"))
    pages = sorted(build_sitemap.collect_pages(tmp_path), key=lambda page: page["url"])
    assert pages == [
        {"url": "/help/billing", "updated": "2026-09-01"},
        {"url": "/pricing", "updated": "2026-10-12"},
    ]


def test_build_sitemap():
    sitemap = build_sitemap.build_sitemap(
        [{"url": "/", "updated": "2026-11-04"}], "https://tessellate.example/"
    )
    assert sitemap == (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        "  <url>\n"
        "    <loc>https://tessellate.example/</loc>\n"
        "    <lastmod>2026-11-04</lastmod>\n"
        "  </url>\n"
        "</urlset>\n"
    )


def test_main_writes_the_sitemap(tmp_path):
    write_site(tmp_path)
    write(tmp_path, "website/pricing.md", PAGE)
    out = tmp_path / "sitemap.xml"
    assert build_sitemap.main(["--out", str(out)], root=tmp_path) == 0
    assert "<loc>https://tessellate.example/pricing</loc>" in out.read_text(encoding="utf-8")
