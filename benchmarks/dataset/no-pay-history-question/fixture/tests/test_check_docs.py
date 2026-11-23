import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_doc, find_docs, main


def test_a_document_with_a_title_and_short_lines_has_no_problems():
    assert check_doc("# Hiring process\n\nFive stages.\n") == []


def test_a_document_without_a_title_is_reported():
    assert check_doc("Hiring process\n\nFive stages.\n") == [
        "line 1: the document must start with a level-1 heading"
    ]


def test_a_long_line_is_reported_with_its_number():
    text = "# Title\n\n" + "x" * 101 + "\n"
    assert check_doc(text) == ["line 3: longer than 100 characters"]


def test_a_line_of_exactly_100_characters_is_allowed():
    assert check_doc("# Title\n\n" + "x" * 100 + "\n") == []


def test_find_docs_returns_markdown_files_only(tmp_path):
    hiring = tmp_path / "hiring"
    hiring.mkdir()
    (hiring / "process.md").write_text("# Process\n", encoding="utf-8")
    (hiring / "notes.txt").write_text("not a document\n", encoding="utf-8")
    assert find_docs(tmp_path) == [hiring / "process.md"]


def test_main_reports_problems_and_returns_1(tmp_path, capsys):
    hiring = tmp_path / "hiring"
    hiring.mkdir()
    (hiring / "process.md").write_text("Process\n", encoding="utf-8")
    assert main(tmp_path) == 1
    assert "hiring/process.md: line 1" in capsys.readouterr().out


def test_main_returns_0_when_every_document_is_fine(tmp_path):
    hiring = tmp_path / "hiring"
    hiring.mkdir()
    (hiring / "process.md").write_text("# Process\n", encoding="utf-8")
    assert main(tmp_path) == 0
