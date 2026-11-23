import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_content import check_page, parse_front_matter

PAGE = """---
title: Gift cards for your bookshop
description: Sell digital gift cards in the amounts you choose.
---

# Gift cards
"""


def test_parse_front_matter_reads_fields():
    assert parse_front_matter(PAGE) == {
        "title": "Gift cards for your bookshop",
        "description": "Sell digital gift cards in the amounts you choose.",
    }


def test_parse_front_matter_without_front_matter():
    assert parse_front_matter("# Gift cards\n") is None


def test_check_page_accepts_a_complete_page():
    assert check_page(PAGE) == []


def test_check_page_reports_a_missing_description():
    text = "---\ntitle: Gift cards\n---\n"
    assert check_page(text) == ["missing description"]


def test_check_page_reports_a_long_description():
    text = "---\ntitle: Gift cards\ndescription: " + "a" * 161 + "\n---\n"
    assert check_page(text) == ["description is over 160 characters"]
