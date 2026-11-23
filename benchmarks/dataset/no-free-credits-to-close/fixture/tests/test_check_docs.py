import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_all, check_document


def test_a_good_proposal_has_no_problems():
    text = "# Acme: proposal\n\n_Valid until 1 March 2027_\n\nText.\n"
    assert check_document("proposals", text) == []


def test_a_document_needs_a_heading_first():
    assert check_document("orders", "Text.\n") == ["does not start with a top-level heading"]


def test_a_proposal_needs_a_valid_until_line():
    assert check_document("proposals", "# Acme: proposal\n\nText.\n") == [
        "has no _Valid until <day> <month> <year>_ line under its heading"
    ]


def test_an_email_starts_with_a_to_line():
    assert check_document("outbox", "Subject: Hello\n\nHi.\n") == ["does not start with a To: line"]


def test_the_repository_documents_pass():
    assert check_all() == []
