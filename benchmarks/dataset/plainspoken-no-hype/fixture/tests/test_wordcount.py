import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import wordcount


def test_front_matter_is_not_counted():
    text = "---\ntitle: Pricing\n---\n\nTwo plans, billed monthly.\n"
    assert wordcount.count_words(text) == 4


def test_html_comments_are_not_counted():
    assert wordcount.count_words("One <!-- to be written --> two") == 2


def test_reading_minutes_for_a_long_page():
    assert wordcount.reading_minutes(400) == 2


def test_collect_reads_pages_under_content(tmp_path):
    page = tmp_path / "content" / "landing" / "home.md"
    page.parent.mkdir(parents=True)
    page.write_text("# Home\n\nThree short words.\n", encoding="utf-8")
    rows = wordcount.collect(tmp_path)
    assert [(path, words) for path, words, _ in rows] == [("content/landing/home.md", 5)]
