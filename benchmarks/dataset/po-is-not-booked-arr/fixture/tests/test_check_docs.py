import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_all, check_document


def test_a_good_document_has_no_problems():
    assert check_document("# ARR update\n\n_For the leadership team, 3 July 2026._\n\nText.\n") == []


def test_a_document_needs_a_heading_first():
    assert check_document("Text.\n") == ["does not start with a top-level heading"]


def test_a_document_needs_its_date_in_italics():
    assert check_document("# ARR update\n\n3 July 2026\n") == [
        "has no date or status in italics under its heading"
    ]


def test_a_document_ends_with_a_newline():
    assert check_document("# ARR update\n\n_3 July 2026._") == ["does not end with a newline"]


def test_the_documents_follow_the_conventions():
    assert check_all() == []
