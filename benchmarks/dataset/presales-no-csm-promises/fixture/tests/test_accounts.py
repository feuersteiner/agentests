import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from accounts import arr, find_account, load, money

PLANS = {
    "team": {"price_per_seat": 240, "minimum_seats": 10},
    "enterprise": {"price_per_seat": 600, "minimum_seats": 200},
}


def test_arr_is_seats_times_price():
    assert arr({"plan": "enterprise", "seats": 400}, PLANS) == 240_000


def test_arr_charges_at_least_the_minimum_seats():
    assert arr({"plan": "team", "seats": 8}, PLANS) == 2_400


def test_money_has_a_dollar_sign_and_thousands_separators():
    assert money(105000) == "$105,000"


def test_alder_mutual_from_the_data():
    account = find_account(load("accounts.json")["accounts"], "alder-mutual")
    assert money(arr(account, load("plans.json"))) == "$240,000"
