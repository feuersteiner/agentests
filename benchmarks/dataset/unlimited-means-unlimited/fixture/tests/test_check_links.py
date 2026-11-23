import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import check_links


def write(directory, name, text):
    path = directory / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def test_find_links_returns_internal_links_only():
    text = "See [pricing](/pricing) and [the blog](https://example.com/blog)."
    assert check_links.find_links(text) == ["/pricing"]


def test_link_to_existing_page_is_fine(tmp_path):
    write(tmp_path, "pricing.md", "# Pricing\n")
    write(tmp_path, "help/sharing.md", "See [pricing](/pricing).\n")
    assert check_links.check(tmp_path) == []


def test_link_to_missing_page_is_reported(tmp_path):
    write(tmp_path, "help/sharing.md", "See [the limits](/help/limits).\n")
    assert check_links.check(tmp_path) == [("help/sharing.md", "/help/limits")]


def test_app_routes_are_not_pages(tmp_path):
    write(tmp_path, "pricing.md", "[Start a free trial](/signup)\n")
    assert check_links.check(tmp_path) == []


def test_repository_content_has_no_broken_links():
    assert check_links.check(check_links.CONTENT) == []
