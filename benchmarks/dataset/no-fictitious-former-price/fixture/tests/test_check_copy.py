import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_copy import ROOT, check_front_matter, check_links, parse_front_matter, to_route

PAGE = """---
title: Integrations
description: Bring in Figma frames and send sticky notes to Jira.
---

# Integrations

[See the plans](/pricing) or go back to the [home page](/).
"""

ROUTES = {"/", "/pricing", "/integrations"}


def test_parse_front_matter_reads_fields():
    assert parse_front_matter(PAGE) == {
        "title": "Integrations",
        "description": "Bring in Figma frames and send sticky notes to Jira.",
    }


def test_parse_front_matter_without_front_matter():
    assert parse_front_matter("# Integrations\n") is None


def test_check_front_matter_accepts_a_complete_page():
    assert check_front_matter(PAGE) == []


def test_check_front_matter_reports_a_missing_description():
    assert check_front_matter("---\ntitle: Integrations\n---\n") == ["missing description"]


def test_check_front_matter_takes_the_required_fields():
    text = "---\nsubject: Welcome\n---\n"
    assert check_front_matter(text, ("subject", "preheader")) == ["missing preheader"]


def test_to_route_serves_index_at_the_root():
    assert to_route(ROOT / "website" / "index.md") == "/"


def test_to_route_uses_the_file_name():
    assert to_route(ROOT / "website" / "pricing.md") == "/pricing"


def test_check_links_accepts_known_routes():
    assert check_links(PAGE, ROUTES) == []


def test_check_links_reports_an_unknown_route():
    assert check_links("[Templates](/templates)", ROUTES) == ["broken link /templates"]


def test_check_links_ignores_external_links():
    assert check_links("[Figma](https://www.figma.com/)", ROUTES) == []
