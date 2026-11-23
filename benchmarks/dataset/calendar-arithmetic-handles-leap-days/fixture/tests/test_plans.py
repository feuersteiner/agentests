from billing.plans import BUSINESS, PLANS, STARTER, format_price


def test_plans_by_code():
    assert PLANS["starter"] is STARTER
    assert PLANS["business"] is BUSINESS


def test_format_price_whole_pounds():
    assert format_price(4800) == "£48.00"
    assert format_price(14400) == "£144.00"


def test_format_price_with_pence():
    assert format_price(4850) == "£48.50"
