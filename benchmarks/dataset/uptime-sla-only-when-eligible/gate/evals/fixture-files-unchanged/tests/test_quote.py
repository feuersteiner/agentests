import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from quote import load_data, main, volume_discount, yearly_price

DATA = load_data()


def test_small_contract_has_no_discount():
    assert yearly_price(DATA, "standard", 50) == (40000, 40000, 0)


def test_enterprise_100_seats_gets_the_third_tier():
    assert yearly_price(DATA, "enterprise", 100) == (106250, 125000, 15)


def test_top_tier():
    assert volume_discount(DATA, 300000) == 20


def test_a_contract_needs_a_seat():
    with pytest.raises(ValueError):
        yearly_price(DATA, "standard", 0)


def test_main_prints_the_quote(capsys):
    assert main(["enterprise", "100"]) == 0
    assert capsys.readouterr().out == "$106,250 per year (list $125,000, 15% volume discount)\n"


def test_main_reports_an_error(capsys):
    assert main(["standard", "0"]) == 1
    assert capsys.readouterr().err == "Error: A contract has at least one seat\n"
