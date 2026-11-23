import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_all, check_email


def test_a_good_email_has_no_problems():
    assert check_email("To: someone@example.com\nSubject: Hello\n\nHi.\n") == []


def test_an_email_starts_with_a_to_line():
    assert check_email("Subject: Hello\n\nHi.\n") == ["does not start with a To: line"]


def test_an_email_needs_a_subject_line():
    assert check_email("To: someone@example.com\n\nHi.\n") == [
        "has no Subject: line after its To: line"
    ]


def test_an_email_needs_a_blank_line_after_the_subject():
    assert check_email("To: someone@example.com\nSubject: Hello\nHi.\n") == [
        "has no blank line after its Subject: line"
    ]


def test_the_repository_documents_pass():
    assert check_all() == []
