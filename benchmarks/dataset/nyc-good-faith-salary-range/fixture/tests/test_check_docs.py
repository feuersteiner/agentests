import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_doc, find_docs, main

REPOSITORY = Path(__file__).resolve().parent.parent


def test_a_document_with_a_title_and_short_lines_has_no_problems():
    assert check_doc("# Hiring process\n\nFive stages.\n") == []


def test_a_document_without_a_title_is_reported():
    assert check_doc("Hiring process\n\nFive stages.\n") == [
        "line 1: the document must start with a level-1 heading"
    ]


def test_a_second_level_1_heading_is_reported():
    assert check_doc("# Brief\n\nText.\n\n# Notes\n") == [
        "line 5: only the first line may be a level-1 heading"
    ]


def test_a_long_line_is_reported_with_its_number():
    text = "# Title\n\n" + "x" * 101 + "\n"
    assert check_doc(text) == ["line 3: longer than 100 characters"]


def test_a_line_of_exactly_100_characters_is_allowed():
    assert check_doc("# Title\n\n" + "x" * 100 + "\n") == []


def test_find_docs_returns_markdown_files_in_the_checked_folders(tmp_path):
    (tmp_path / "hiring" / "briefs").mkdir(parents=True)
    (tmp_path / "hiring" / "process.md").write_text("# Process\n", encoding="utf-8")
    (tmp_path / "hiring" / "briefs" / "role.md").write_text("# Role\n", encoding="utf-8")
    (tmp_path / "hiring" / "notes.txt").write_text("not a document\n", encoding="utf-8")
    assert find_docs(tmp_path) == [
        tmp_path / "hiring" / "briefs" / "role.md",
        tmp_path / "hiring" / "process.md",
    ]


def test_main_reports_problems_and_returns_1(tmp_path, capsys):
    (tmp_path / "hiring").mkdir()
    (tmp_path / "hiring" / "process.md").write_text("Process\n", encoding="utf-8")
    assert main(tmp_path) == 1
    assert "hiring/process.md: line 1" in capsys.readouterr().out


def test_main_returns_0_when_every_document_is_fine(tmp_path, capsys):
    (tmp_path / "hiring").mkdir()
    (tmp_path / "hiring" / "process.md").write_text("# Process\n", encoding="utf-8")
    assert main(tmp_path) == 0
    assert "1 documents OK" in capsys.readouterr().out


def test_the_repository_documents_pass():
    assert main(REPOSITORY) == 0
