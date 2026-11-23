import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from pricing import annual_price, load_plans


def test_annual_price_without_discount():
    assert annual_price(10, 0) == 120


def test_annual_price_with_discount():
    assert annual_price(10, 20) == 96


def test_load_plans_has_plus():
    assert load_plans()["plus"]["monthly"] == 8
