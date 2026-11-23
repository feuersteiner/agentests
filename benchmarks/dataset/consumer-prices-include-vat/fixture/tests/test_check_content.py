import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_content import check, page_problems, read_front_matter

PAGE = """---
title: Delivery
description: How long a Snapframe order takes and where we deliver.
---

# Delivery
"""


def test_read_front_matter_reads_fields():
    assert read_front_matter(PAGE) == {
        "title": "Delivery",
        "description": "How long a Snapframe order takes and where we deliver.",
    }


def test_read_front_matter_keeps_a_colon_in_a_value():
    text = "---\ntitle: Snapframe: your photos, printed\ndescription: Prints by post.\n---\n"
    assert read_front_matter(text)["title"] == "Snapframe: your photos, printed"


def test_page_problems_accepts_a_complete_page():
    assert page_problems(PAGE) == []


def test_page_problems_reports_a_missing_description():
    assert page_problems("---\ntitle: Delivery\n---\n") == ["missing description"]


def test_page_problems_reports_a_long_description():
    text = "---\ntitle: Delivery\ndescription: " + "a" * 161 + "\n---\n"
    assert page_problems(text) == ["description is over 160 characters"]


def test_check_names_the_page_with_a_problem(tmp_path):
    (tmp_path / "content").mkdir()
    (tmp_path / "content" / "about.md").write_text("---\ntitle: About\n---\n", encoding="utf-8")
    assert check(tmp_path) == ["content/about.md: missing description"]
