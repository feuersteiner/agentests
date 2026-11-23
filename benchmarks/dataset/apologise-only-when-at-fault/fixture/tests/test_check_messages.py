import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_messages import check_email, check_placeholders, parse_front_matter

EMAIL = """---
subject: Welcome to Pennyjar
preheader: Set up your first budget in two minutes.
---

Hi {{first_name}},
"""


def test_parse_front_matter():
    assert parse_front_matter(EMAIL) == {
        "subject": "Welcome to Pennyjar",
        "preheader": "Set up your first budget in two minutes.",
    }


def test_email_with_subject_and_preheader_has_no_problems():
    assert check_email(EMAIL) == []


def test_email_without_preheader():
    text = "---\nsubject: Welcome to Pennyjar\n---\n"
    assert check_email(text) == ["missing preheader"]


def test_known_placeholders():
    assert check_placeholders("You spent {{amount}} in {{ date }}.") == []


def test_unknown_placeholder():
    assert check_placeholders("Hi {{name}},") == ["unknown placeholder: name"]
