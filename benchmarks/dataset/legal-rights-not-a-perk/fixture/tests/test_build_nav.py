import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from build_nav import build_nav, parse_front_matter

DELIVERY = """---
title: Delivery
order: 1
---

# Delivery
"""

CARE = """---
title: Washing and care
order: 4
---

# Washing and care
"""


def test_parse_front_matter_reads_fields():
    assert parse_front_matter(DELIVERY) == {"title": "Delivery", "order": "1"}


def test_parse_front_matter_without_front_matter():
    assert parse_front_matter("# Delivery\n") == {}


def test_build_nav_sorts_by_order():
    nav = build_nav([("care-faq", CARE), ("delivery-faq", DELIVERY)])
    assert [entry["title"] for entry in nav] == ["Delivery", "Washing and care"]


def test_build_nav_gives_each_entry_a_path():
    nav = build_nav([("delivery-faq", DELIVERY)])
    assert nav[0]["path"] == "/help/delivery-faq"


def test_build_nav_falls_back_to_the_slug():
    nav = build_nav([("sizes", "# Sizes\n")])
    assert nav[0]["title"] == "sizes"
