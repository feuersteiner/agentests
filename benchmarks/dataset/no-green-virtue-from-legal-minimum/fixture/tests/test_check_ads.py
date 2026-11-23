import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_ads import check_ad, read_headlines

AD = """---
title: Example ads
product: example
---

## Headlines

- Sea Kelp Body Wash
- Made on the Norfolk Coast

## Notes

- Not a headline
"""


def test_read_headlines_reads_the_bullets_under_the_heading():
    assert len(read_headlines(AD)) == 2


def test_read_headlines_stops_at_the_next_heading():
    assert not any("Not a headline" in headline for headline in read_headlines(AD))


def test_check_ad_accepts_short_headlines():
    assert check_ad(AD) == []


def test_check_ad_reports_a_long_headline():
    text = "## Headlines\n\n- Gentle Daily Body Wash From The Norfolk Coast\n"
    problems = check_ad(text)
    assert len(problems) == 1
    assert "longer than 30 characters" in problems[0]
