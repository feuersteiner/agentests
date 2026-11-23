import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import check_copy  # noqa: E402

PAGE = "---\ntitle: Pricing\ndescription: Plans and prices.\n---\n\n# Pricing\n"
EMAIL = "---\nsubject: What's new\npreheader: Three new features.\n---\n\nHi there,\n"


def write(root, path, text):
    file = root / path
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(text, encoding="utf-8")


def test_parse_front_matter_reads_fields():
    assert check_copy.parse_front_matter(PAGE) == {
        "title": "Pricing",
        "description": "Plans and prices.",
    }


def test_parse_front_matter_without_front_matter():
    assert check_copy.parse_front_matter("# Pricing\n") is None


def test_required_fields():
    assert check_copy.required_fields(Path("website/pricing.md")) == ("title", "description")
    assert check_copy.required_fields(Path("marketing/october-update-email.md")) == (
        "subject",
        "preheader",
    )
    assert check_copy.required_fields(Path("marketing/launch-posts.md")) == ("title",)


def test_page_without_description_is_reported(tmp_path):
    write(tmp_path, "website/index.md", "---\ntitle: Home\n---\n\n# Home\n")
    assert check_copy.check_file(tmp_path, Path("website/index.md")) == [
        "website/index.md: missing description"
    ]


def test_email_needs_subject_and_preheader(tmp_path):
    write(tmp_path, "marketing/news-email.md", "---\nsubject: News\n---\n\nHi,\n")
    assert check_copy.check_file(tmp_path, Path("marketing/news-email.md")) == [
        "marketing/news-email.md: missing preheader"
    ]


def test_link_to_existing_page_passes(tmp_path):
    write(tmp_path, "website/pricing.md", PAGE)
    write(tmp_path, "website/index.md", PAGE + "\n[Pricing](/pricing) and [home](/)\n")
    assert check_copy.check_file(tmp_path, Path("website/index.md")) == []


def test_broken_link_is_reported(tmp_path):
    write(tmp_path, "marketing/news-email.md", EMAIL + "\n[Teams](/teams)\n")
    assert check_copy.check_file(tmp_path, Path("marketing/news-email.md")) == [
        "marketing/news-email.md: broken link /teams"
    ]


def test_main_reports_problems(tmp_path, capsys):
    write(tmp_path, "website/index.md", "---\ntitle: Home\n---\n")
    write(tmp_path, "marketing/news-email.md", EMAIL)
    assert check_copy.main(tmp_path) == 1
    assert capsys.readouterr().out == "website/index.md: missing description\n"


def test_main_passes_clean_copy(tmp_path, capsys):
    write(tmp_path, "website/index.md", PAGE)
    write(tmp_path, "marketing/news-email.md", EMAIL)
    assert check_copy.main(tmp_path) == 0
    assert capsys.readouterr().out == "All copy checks passed.\n"
