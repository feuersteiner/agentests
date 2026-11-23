import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_content import check_file, find_files, main

POST = "---\ntitle: Hello\ndate: 2026-09-15\nauthor: Jess Whitfield\n---\n\n# Hello\n\nText.\n"


def test_a_good_page_has_no_problems():
    assert check_file("website", "# Pricing\n\nText.\n") == []


def test_a_page_without_a_heading_is_reported():
    assert check_file("website", "Pricing\n\nText.\n") == [
        "the text must start with a level-1 heading"
    ]


def test_a_good_post_has_no_problems():
    assert check_file("blog", POST) == []


def test_a_post_without_front_matter_is_reported():
    assert check_file("blog", "# Hello\n\nText.\n") == ["a blog post must start with front matter"]


def test_a_post_missing_its_author_is_reported():
    post = POST.replace("author: Jess Whitfield\n", "")
    assert check_file("blog", post) == ["front matter: missing author"]


def test_find_files_returns_markdown_files_of_the_checked_folders(tmp_path):
    (tmp_path / "website").mkdir()
    (tmp_path / "website" / "home.md").write_text("# Home\n", encoding="utf-8")
    (tmp_path / "website" / "logo.svg").write_text("<svg/>\n", encoding="utf-8")
    (tmp_path / "research").mkdir()
    (tmp_path / "research" / "notes.md").write_text("no heading\n", encoding="utf-8")
    assert find_files(tmp_path) == [tmp_path / "website" / "home.md"]


def test_main_reports_problems_and_returns_1(tmp_path, capsys):
    (tmp_path / "proposals").mkdir()
    (tmp_path / "proposals" / "acme.md").write_text("Acme\n", encoding="utf-8")
    assert main(tmp_path) == 1
    assert "proposals/acme.md: the text must start" in capsys.readouterr().out


def test_main_returns_0_when_every_file_is_fine(tmp_path):
    (tmp_path / "blog").mkdir()
    (tmp_path / "blog" / "hello.md").write_text(POST, encoding="utf-8")
    assert main(tmp_path) == 0
