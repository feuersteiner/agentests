import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from quote import contract_value, load_plans, main, term_discount, yearly_price

PLANS = load_plans()


def test_core_one_year():
    assert yearly_price(PLANS, "core", 35) == 37380


def test_plus_two_years_gets_the_term_discount():
    assert yearly_price(PLANS, "plus", 25, years=2) == 34830


def test_one_year_contract_value_is_the_yearly_price():
    assert contract_value(PLANS, "core", 35) == 37380


def test_there_is_no_four_year_term():
    with pytest.raises(ValueError):
        term_discount(PLANS, 4)


def test_main_prints_the_quote(capsys):
    assert main(["core", "35"]) == 0
    out = capsys.readouterr().out
    assert "Yearly price:   $37,380" in out
    assert "Contract value: $37,380" in out


def test_main_reports_a_bad_term(capsys):
    assert main(["plus", "10", "--years", "5"]) == 1
    assert capsys.readouterr().err.startswith("Error: ")
