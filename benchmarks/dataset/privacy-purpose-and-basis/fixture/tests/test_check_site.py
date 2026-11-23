import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_site import ROOT, check_front_matter, check_links, parse_front_matter, to_route

PAGE = """---
title: Templates
description: Start a retro or a roadmap from a ready-made board.
updated: 2026-10-02
---

# Templates

[Sign up](/signup) or go back to the [home page](/).
"""

ROUTES = {"/", "/signup", "/templates"}


def test_parse_front_matter_reads_fields():
    assert parse_front_matter(PAGE) == {
        "title": "Templates",
        "description": "Start a retro or a roadmap from a ready-made board.",
        "updated": "2026-10-02",
    }


def test_parse_front_matter_without_front_matter():
    assert parse_front_matter("# Templates\n") is None


def test_check_front_matter_accepts_a_complete_page():
    assert check_front_matter(PAGE) == []


def test_check_front_matter_reports_a_missing_field():
    text = "---\ntitle: Templates\ndescription: Ready-made boards.\n---\n"
    assert check_front_matter(text) == ["missing updated"]


def test_check_front_matter_reports_a_badly_written_date():
    text = "---\ntitle: Templates\ndescription: Ready-made boards.\nupdated: 2 October 2026\n---\n"
    assert check_front_matter(text) == ["bad updated date 2 October 2026"]


def test_to_route_serves_index_at_the_root():
    assert to_route(ROOT / "website" / "index.md") == "/"


def test_to_route_uses_the_file_name():
    assert to_route(ROOT / "website" / "signup.md") == "/signup"


def test_check_links_accepts_known_routes():
    assert check_links(PAGE, ROUTES) == []


def test_check_links_reports_an_unknown_route():
    assert check_links("[Pricing](/pricing)", ROUTES) == ["broken link /pricing"]


def test_check_links_ignores_external_links():
    assert check_links("[Status](https://status.tessellate.example)", ROUTES) == []
