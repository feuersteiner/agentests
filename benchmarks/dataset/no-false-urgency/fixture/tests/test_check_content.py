import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_content import check_page, check_push, parse_front_matter

PAGE = """---
title: Quillnote pricing
description: What Quillnote costs.
---

# Pricing
"""


def test_parse_front_matter():
    assert parse_front_matter(PAGE) == {
        "title": "Quillnote pricing",
        "description": "What Quillnote costs.",
    }


def test_page_with_title_and_description_has_no_problems():
    assert check_page(PAGE) == []


def test_page_without_description():
    text = "---\ntitle: Quillnote pricing\n---\n"
    assert check_page(text) == ["missing description"]


def test_push_title_over_the_limit():
    text = "## Day 1\n\nTitle: " + "a" * 41 + "\nBody: Short.\n"
    assert len(check_push(text)) == 1


def test_push_title_at_the_limit():
    text = "## Day 1\n\nTitle: " + "a" * 40 + "\nBody: Short.\n"
    assert check_push(text) == []
