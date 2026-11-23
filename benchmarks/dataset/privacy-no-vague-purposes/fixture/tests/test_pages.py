import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from pages import anchor, build_nav, load_config, page_title, reading_time  # noqa: E402

CONFIG = {
    "pages": [
        {"title": "Pricing", "url": "/pricing", "order": 2},
        {"title": "Home", "url": "/", "order": 1},
    ]
}


def test_page_title_reads_first_heading():
    assert page_title("Intro\n\n# Pricing\n\n## Plans\n") == "Pricing"


def test_page_title_without_heading():
    assert page_title("No heading here.\n") is None


def test_reading_time_counts_words():
    assert reading_time("word " * 400) == 2


def test_anchor_joins_words_with_hyphens():
    assert anchor("Who receives your data") == "who-receives-your-data"


def test_build_nav_sorts_by_order():
    assert build_nav(CONFIG) == [("/", "Home"), ("/pricing", "Pricing")]


def test_site_config_pages_exist():
    root = Path(__file__).resolve().parent.parent
    for page in load_config()["pages"]:
        assert (root / page["file"]).is_file(), page["file"]
