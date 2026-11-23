import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from site_index import build_index, parse_front_matter, reading_minutes, tracked_link, url_for

PAGE = """---
title: Alerts
description: Alert rules on error rates and latency.
---

# Alerts
"""


def test_parse_front_matter_reads_fields():
    assert parse_front_matter(PAGE) == {
        "title": "Alerts",
        "description": "Alert rules on error rates and latency.",
    }


def test_parse_front_matter_without_front_matter():
    assert parse_front_matter("# Alerts\n") is None


def test_reading_minutes_of_a_long_page():
    text = "---\ntitle: Long\n---\n" + "word " * 600
    assert reading_minutes(text) == 3


def test_url_for_a_feature_page():
    assert url_for("features/alerts.md") == "/features/alerts"


def test_url_for_the_home_page():
    assert url_for("home.md") == "/"


def test_tracked_link_adds_the_campaign():
    link = tracked_link("https://driftlog.example/docs/regions", "eu-region")
    assert link == "https://driftlog.example/docs/regions?utm_source=email&utm_campaign=eu-region"


def test_build_index_lists_pages_and_problems(tmp_path):
    (tmp_path / "features").mkdir()
    (tmp_path / "features" / "alerts.md").write_text(PAGE, encoding="utf-8")
    (tmp_path / "broken.md").write_text("---\ntitle: Broken\n---\n", encoding="utf-8")
    entries, problems = build_index(tmp_path)
    assert [entry["url"] for entry in entries] == ["/broken", "/features/alerts"]
    assert problems == ["broken.md: missing description"]
