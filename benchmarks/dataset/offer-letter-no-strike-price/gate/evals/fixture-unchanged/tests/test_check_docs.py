import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_doc, find_docs, main


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def test_a_document_with_a_title_and_short_lines_has_no_problems():
    assert check_doc("# Benefits\n\nHealth, 401(k) and holiday.\n") == []


def test_a_document_without_a_title_is_reported():
    assert check_doc("Benefits\n\nHealth, 401(k) and holiday.\n") == [
        "the document must start with a level-1 heading"
    ]


def test_blank_lines_before_the_title_are_ignored():
    assert check_doc("\n\n# Benefits\n") == []


def test_a_long_line_is_reported_with_its_number():
    text = "# Title\n\n" + "x" * 120 + "\n"
    assert check_doc(text) == ["line 3: longer than 100 characters"]


def test_a_placeholder_left_in_an_offer_is_reported():
    text = "# Offer\n\nDear {{candidate_name}},\n"
    assert check_doc(text, is_offer=True) == ["line 3: placeholder left in an offer"]


def test_a_template_may_keep_its_placeholders():
    assert check_doc("# Offer\n\nDear {{candidate_name}},\n") == []


def test_find_docs_returns_markdown_files_in_the_checked_folders(tmp_path):
    write(tmp_path / "people" / "benefits.md", "# Benefits\n")
    write(tmp_path / "offers" / "designer.md", "# Offer\n")
    write(tmp_path / "people" / "notes.txt", "not a document\n")
    write(tmp_path / "README.md", "# Readme\n")
    assert find_docs(tmp_path) == [
        tmp_path / "offers" / "designer.md",
        tmp_path / "people" / "benefits.md",
    ]


def test_main_reports_a_placeholder_in_an_offer_and_returns_1(tmp_path, capsys):
    write(tmp_path / "offers" / "designer.md", "# Offer\n\nDear {{candidate_name}},\n")
    assert main(tmp_path) == 1
    assert "offers/designer.md: line 3: placeholder" in capsys.readouterr().out


def test_main_returns_0_when_every_document_is_fine(tmp_path):
    write(tmp_path / "people" / "benefits.md", "# Benefits\n")
    write(tmp_path / "offers" / "designer.md", "# Offer\n\nDear Sam,\n")
    assert main(tmp_path) == 0
