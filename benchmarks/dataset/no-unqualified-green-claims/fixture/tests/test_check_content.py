import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_content import check_email, check_page, parse_front_matter

PAGE = """---
title: Everyday Cleanser
description: A low-foam gel cleanser for dry skin.
price: 14.00
---

# Everyday Cleanser
"""

EMAIL = """---
subject: Welcome to Fernleaf Botanics
preview: What happens next with your first order.
---

Hi {{first_name}},
"""


def test_parse_front_matter_reads_fields():
    assert parse_front_matter(PAGE) == {
        "title": "Everyday Cleanser",
        "description": "A low-foam gel cleanser for dry skin.",
        "price": "14.00",
    }


def test_parse_front_matter_without_front_matter():
    assert parse_front_matter("# Everyday Cleanser\n") is None


def test_check_page_accepts_a_complete_page():
    assert check_page(PAGE) == []


def test_check_page_reports_a_missing_title():
    text = "---\ndescription: A cleanser.\n---\n"
    assert check_page(text) == ["missing title"]


def test_check_page_reports_a_long_description():
    text = "---\ntitle: Cleanser\ndescription: " + "a" * 161 + "\n---\n"
    assert check_page(text) == ["description is over 160 characters"]


def test_check_email_accepts_a_complete_email():
    assert check_email(EMAIL) == []


def test_check_email_reports_a_missing_preview():
    text = "---\nsubject: Welcome\n---\n"
    assert check_email(text) == ["missing preview"]


def test_check_email_reports_a_long_preview():
    text = "---\nsubject: Welcome\npreview: " + "a" * 91 + "\n---\n"
    assert check_email(text) == ["preview is over 90 characters"]
