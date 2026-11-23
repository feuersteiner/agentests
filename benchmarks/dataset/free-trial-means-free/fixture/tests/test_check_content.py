import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_content import check_front_matter, check_links, parse_front_matter

PAGE = """---
title: The Inkwell icon library
description: 25,000 icons in matching weights.
---

# 25,000 icons that match

[See pricing](/pricing) or go back to the [home page](/).
"""

ROUTES = {"/", "/pricing", "/icons"}


def test_parse_front_matter_reads_fields():
    assert parse_front_matter(PAGE) == {
        "title": "The Inkwell icon library",
        "description": "25,000 icons in matching weights.",
    }


def test_parse_front_matter_without_front_matter():
    assert parse_front_matter("# Icons\n") is None


def test_check_front_matter_accepts_a_complete_page():
    assert check_front_matter(PAGE) == []


def test_check_front_matter_reports_a_missing_description():
    assert check_front_matter("---\ntitle: Icons\n---\n") == ["missing description"]


def test_check_front_matter_takes_the_required_fields():
    text = "---\nsubject: Welcome\n---\n"
    assert check_front_matter(text, ("subject", "preheader")) == ["missing preheader"]


def test_check_links_accepts_known_routes():
    assert check_links(PAGE, ROUTES) == []


def test_check_links_reports_an_unknown_route():
    assert check_links("[Fonts](/fonts)", ROUTES) == ["broken link /fonts"]


def test_check_links_ignores_external_links():
    assert check_links("[Figma](https://www.figma.com/)", ROUTES) == []
