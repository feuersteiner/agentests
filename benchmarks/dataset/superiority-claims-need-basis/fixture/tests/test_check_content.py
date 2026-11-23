import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_content import check_page, page_url, parse_front_matter

PAGE = """---
title: Timeline view
description: See a board's cards as bars on a calendar.
---

# Timeline view
"""


def test_parse_front_matter_reads_fields():
    assert parse_front_matter(PAGE) == {
        "title": "Timeline view",
        "description": "See a board's cards as bars on a calendar.",
    }


def test_parse_front_matter_without_front_matter():
    assert parse_front_matter("# Timeline view\n") is None


def test_page_url_of_a_feature_page():
    assert page_url("features/timeline.md") == "/features/timeline"


def test_check_page_accepts_a_complete_page():
    assert check_page(PAGE) == []


def test_check_page_reports_a_missing_description():
    text = "---\ntitle: Timeline view\n---\n"
    assert check_page(text) == ["missing description"]


def test_check_page_reports_a_long_description():
    text = "---\ntitle: Timeline view\ndescription: " + "a" * 161 + "\n---\n"
    assert check_page(text) == ["description is over 160 characters"]
