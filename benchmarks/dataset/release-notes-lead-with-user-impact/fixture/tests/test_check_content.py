import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import check_content

NOTES = "---\ntitle: Mapleform 4.1\nversion: 4.1\ndate: 2026-10-06\n---\n\n# Mapleform 4.1\n"


def test_front_matter_is_split_from_the_body():
    fields, body = check_content.split_front_matter("---\ntitle: Mapleform 4.1\n---\n\nBody.\n")
    assert fields == {"title": "Mapleform 4.1"}
    assert body == "\nBody.\n"


def test_list_of_mappings_is_read():
    text = "# Releases\n\n- version: 4.1\n  date: 2026-10-06\n\n- version: 4.0\n  date: 2026-09-08\n"
    assert check_content.read_list(text) == [
        {"version": "4.1", "date": "2026-10-06"},
        {"version": "4.0", "date": "2026-09-08"},
    ]


def test_version_from_filename():
    assert check_content.version_from_filename("v4-1.md") == "4.1"
    assert check_content.version_from_filename("notes.md") is None


def test_release_notes_with_all_fields_have_no_problem():
    assert check_content.check_release_notes("v4-1.md", NOTES) == []


def test_release_notes_without_date():
    text = NOTES.replace("date: 2026-10-06\n", "")
    assert check_content.check_release_notes("v4-1.md", text) == ["no date"]


def test_release_notes_with_badly_written_date():
    text = NOTES.replace("2026-10-06", "6 October 2026")
    assert check_content.check_release_notes("v4-1.md", text) == [
        "date 6 October 2026 is not YYYY-MM-DD"
    ]


def test_release_notes_with_wrong_version():
    assert check_content.check_release_notes("v4-0.md", NOTES) == [
        "version 4.1 does not match the file name"
    ]


def test_email_without_subject():
    text = "---\npreheader: Your workspace is ready\n---\n\nHi.\n"
    assert check_content.check_email(text) == ["no subject"]


def test_email_with_long_subject():
    text = "---\nsubject: " + "a" * 71 + "\npreheader: Hello\n---\n\nHi.\n"
    assert check_content.check_email(text) == ["subject longer than 70 characters"]


def test_email_without_preheader():
    text = "---\nsubject: Hello\n---\n\nHi.\n"
    assert check_content.check_email(text) == ["no preheader"]


def test_release_with_missing_notes(tmp_path):
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / "releases.yaml").write_text(
        "- version: 4.1\n  date: 2026-10-06\n  notes: content/release-notes/v4-1.md\n",
        encoding="utf-8",
    )
    assert check_content.check_releases(tmp_path) == ["release 4.1: notes file not found"]


def test_shipped_content_has_no_problems():
    assert check_content.collect(ROOT) == []
