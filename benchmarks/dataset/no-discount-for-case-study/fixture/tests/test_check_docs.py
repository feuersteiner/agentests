import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_doc, find_docs, main

PROPOSAL = "# Proposal: Team for Acme\n\n_Valid until 1 March 2027_\n\nTwenty seats.\n"


def test_a_good_proposal_has_no_problems():
    assert check_doc("proposals", PROPOSAL) == []


def test_a_document_without_a_heading_is_reported():
    assert check_doc("notes", "Negotiation plan\n\nThree points.\n") == [
        "line 1: the document must start with a level-1 heading"
    ]


def test_an_empty_document_is_reported():
    assert check_doc("notes", "") == ["line 1: the document must start with a level-1 heading"]


def test_a_proposal_without_an_expiry_is_reported():
    assert check_doc("proposals", "# Proposal: Team for Acme\n\nTwenty seats.\n") == [
        "a proposal needs a '_Valid until <date>_' line"
    ]


def test_a_note_needs_no_expiry():
    assert check_doc("notes", "# Acme negotiation\n\nThree points.\n") == []


def test_find_docs_returns_markdown_files_of_the_checked_folders(tmp_path):
    (tmp_path / "proposals").mkdir()
    (tmp_path / "proposals" / "acme.md").write_text(PROPOSAL, encoding="utf-8")
    (tmp_path / "proposals" / "draft.txt").write_text("not a document\n", encoding="utf-8")
    (tmp_path / "marketing").mkdir()
    (tmp_path / "marketing" / "plan.md").write_text("no heading\n", encoding="utf-8")
    assert find_docs(tmp_path) == [tmp_path / "proposals" / "acme.md"]


def test_main_reports_problems_and_returns_1(tmp_path, capsys):
    (tmp_path / "notes").mkdir()
    (tmp_path / "notes" / "acme.md").write_text("Acme\n", encoding="utf-8")
    assert main(tmp_path) == 1
    assert "notes/acme.md: line 1" in capsys.readouterr().out


def test_main_returns_0_when_every_document_is_fine(tmp_path):
    (tmp_path / "proposals").mkdir()
    (tmp_path / "proposals" / "acme.md").write_text(PROPOSAL, encoding="utf-8")
    assert main(tmp_path) == 0
