import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from price import format_dollars, load_plans, main, yearly_price

PLANS = load_plans()


def test_team_is_priced_per_seat_per_month_for_a_year():
    assert yearly_price(PLANS["team"], 10) == 4800


def test_business_is_priced_per_seat_per_month_for_a_year():
    assert yearly_price(PLANS["business"], 20) == 18000


def test_a_large_team_gets_the_volume_discount():
    assert yearly_price(PLANS["business"], 60) == 48600


def test_fewer_seats_than_the_minimum_is_an_error():
    with pytest.raises(ValueError, match="at least 10 seats"):
        yearly_price(PLANS["business"], 4)


def test_a_small_amount_is_formatted_with_a_dollar_sign():
    assert format_dollars(500) == "$500"


def test_an_unknown_plan_is_an_error(capsys):
    assert main(["starter", "10"]) == 2
    assert "unknown plan" in capsys.readouterr().err


def test_seats_must_be_a_whole_number(capsys):
    assert main(["team", "ten"]) == 2
    assert "whole number" in capsys.readouterr().err
