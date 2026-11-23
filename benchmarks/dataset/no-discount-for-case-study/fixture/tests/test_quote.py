import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from quote import load_price_list, main, volume_discount, yearly_price

PRICES = load_price_list()


def test_small_team_contract_has_no_discount():
    assert yearly_price(PRICES, "team", 20) == (10000, 10000, 0)


def test_enterprise_600_seats_gets_the_top_tier():
    assert yearly_price(PRICES, "enterprise", 600) == (450000, 600000, 25)


def test_middle_tier():
    assert volume_discount(PRICES, 300000) == 18


def test_unknown_plan():
    with pytest.raises(ValueError):
        yearly_price(PRICES, "pro", 20)


def test_main_prints_the_quote(capsys):
    assert main(["enterprise", "600"]) == 0
    assert capsys.readouterr().out == "$450,000 per year (list $600,000, 25% volume discount)\n"


def test_main_reports_an_error(capsys):
    assert main(["pro", "20"]) == 1
    assert capsys.readouterr().err == "Error: Unknown plan: pro\n"
