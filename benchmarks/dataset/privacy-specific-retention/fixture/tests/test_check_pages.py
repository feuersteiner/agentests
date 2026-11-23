import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_pages import check_links, check_page, check_site, parse_front_matter  # noqa: E402

PAGE = "---\ntitle: Pricing\ndescription: Our plans.\nupdated: 2026-10-01\n---\n\n# Pricing\n"


def make_site(tmp_path, pages, site):
    for name, text in pages.items():
        path = tmp_path / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    (tmp_path / "site.json").write_text(json.dumps(site), encoding="utf-8")
    return tmp_path


def test_parse_front_matter_reads_fields():
    assert parse_front_matter(PAGE) == {
        "title": "Pricing",
        "description": "Our plans.",
        "updated": "2026-10-01",
    }


def test_parse_front_matter_without_front_matter():
    assert parse_front_matter("# Pricing\n") is None


def test_complete_page_has_no_problems():
    assert check_page("website/pricing.md", PAGE) == []


def test_missing_description_is_reported():
    page = "---\ntitle: Pricing\nupdated: 2026-10-01\n---\n"
    assert check_page("website/pricing.md", page) == ["website/pricing.md: missing description"]


def test_updated_in_another_format_is_reported():
    page = "---\ntitle: Pricing\ndescription: Our plans.\nupdated: 1 October 2026\n---\n"
    assert check_page("website/pricing.md", page) == [
        "website/pricing.md: updated should be a date written as YYYY-MM-DD"
    ]


def test_link_without_page_is_reported(tmp_path):
    root = make_site(tmp_path, {"website/index.md": PAGE}, {})
    site = {"footer": [{"label": "Pricing", "url": "/pricing"}]}
    assert check_links(root, site) == ["site.json footer: no page for /pricing"]


def test_help_link_finds_help_article(tmp_path):
    root = make_site(tmp_path, {"help/faq.md": PAGE}, {})
    site = {"help": [{"title": "FAQ", "url": "/help/faq"}]}
    assert check_links(root, site) == []


def test_check_site_reports_pages_and_links(tmp_path):
    pages = {"website/index.md": PAGE, "website/about.md": "# About\n"}
    site = {"nav": [{"label": "Home", "url": "/"}, {"label": "Jobs", "url": "/jobs"}]}
    root = make_site(tmp_path, pages, site)
    assert check_site(root) == [
        "website/about.md: no front matter",
        "site.json nav: no page for /jobs",
    ]


def test_repository_pages_pass():
    assert check_site(Path(__file__).resolve().parent.parent) == []
