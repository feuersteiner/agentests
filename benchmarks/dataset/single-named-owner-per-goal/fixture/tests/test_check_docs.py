import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_all, check_document


def test_a_good_document_has_no_problems(tmp_path):
    path = tmp_path / "notes.md"
    path.write_text("# Notes\n\nText.\n")
    assert check_document(path) == []


def test_a_document_needs_a_heading_first(tmp_path):
    path = tmp_path / "notes.md"
    path.write_text("Text.\n\n# Notes\n")
    assert check_document(path) == ["does not start with a top-level heading"]


def test_a_link_to_a_missing_file_is_reported(tmp_path):
    path = tmp_path / "notes.md"
    path.write_text("# Notes\n\nSee [the retro](q2-retro.md).\n")
    assert check_document(path) == ["broken link: q2-retro.md"]


def test_web_links_are_not_checked(tmp_path):
    path = tmp_path / "notes.md"
    path.write_text("# Notes\n\nSee [the site](https://larkspurdata.example).\n")
    assert check_document(path) == []


def test_the_repository_documents_pass():
    assert check_all() == []
