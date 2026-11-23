import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_all, check_document


def test_a_good_document_has_no_problems():
    assert check_document("proposals", "# Proposal\n\nText.\n") == []


def test_a_document_needs_a_heading_first():
    assert check_document("orders", "Text.\n") == ["does not start with a top-level heading"]


def test_an_email_needs_a_to_line():
    assert check_document("outbox", "# Reply\n\nSubject: Hello\n\nText.\n") == [
        "email has no To: line"
    ]


def test_an_email_with_a_to_line_passes():
    assert check_document("outbox", "# Reply\n\nTo: rosa@example.com\nSubject: Hello\n") == []


def test_the_repository_documents_pass():
    assert check_all() == []
