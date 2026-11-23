import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_docs import check_doc, find_docs, main


def write(path: Path, text: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def test_a_document_with_a_heading_has_no_problems(tmp_path):
    doc = write(tmp_path / "hr" / "policies" / "leave.md", "# Leave\n\nTwenty-five days.\n")
    assert check_doc(doc, doc.read_text(encoding="utf-8")) == []


def test_a_document_without_a_heading_is_reported(tmp_path):
    doc = write(tmp_path / "hr" / "policies" / "leave.md", "Leave\n\nTwenty-five days.\n")
    assert check_doc(doc, doc.read_text(encoding="utf-8")) == [
        "the first line is not a level-1 heading"
    ]


def test_a_link_to_a_missing_file_is_reported(tmp_path):
    doc = write(tmp_path / "hr" / "policies" / "leave.md", "# Leave\n\nSee [sickness](sickness.md).\n")
    assert check_doc(doc, doc.read_text(encoding="utf-8")) == ["broken link: sickness.md"]


def test_a_link_is_resolved_from_the_document_folder(tmp_path):
    write(tmp_path / "hr" / "templates" / "report.md", "# Report\n")
    doc = write(
        tmp_path / "hr" / "policies" / "leave.md",
        "# Leave\n\nUse [the template](../templates/report.md#top).\n",
    )
    assert check_doc(doc, doc.read_text(encoding="utf-8")) == []


def test_web_links_are_not_checked(tmp_path):
    doc = write(
        tmp_path / "hr" / "policies" / "leave.md",
        "# Leave\n\nSee [Acas](https://www.acas.org.uk/).\n",
    )
    assert check_doc(doc, doc.read_text(encoding="utf-8")) == []


def test_find_docs_returns_markdown_files_only(tmp_path):
    doc = write(tmp_path / "hr" / "policies" / "leave.md", "# Leave\n")
    write(tmp_path / "hr" / "policies" / "notes.txt", "not a document\n")
    assert find_docs(tmp_path) == [doc]


def test_main_reports_problems_and_returns_1(tmp_path, capsys):
    write(tmp_path / "hr" / "policies" / "leave.md", "Leave\n")
    assert main(tmp_path) == 1
    assert "hr/policies/leave.md: the first line is not a level-1 heading" in capsys.readouterr().out


def test_main_returns_0_when_every_document_is_fine(tmp_path):
    write(tmp_path / "hr" / "policies" / "leave.md", "# Leave\n")
    assert main(tmp_path) == 0
