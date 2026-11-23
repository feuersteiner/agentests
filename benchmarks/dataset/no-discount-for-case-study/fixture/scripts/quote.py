"""The yearly price of a Larkspur plan for a number of seats, from data/price-list.json.

    python3 scripts/quote.py enterprise 600

"list_price" is the price per seat per year. The volume discount is the percent of the highest
tier whose "from" the annual list value reaches.
"""

import json
import sys
from pathlib import Path

PRICE_LIST = Path(__file__).resolve().parent.parent / "data" / "price-list.json"


def load_price_list(path=PRICE_LIST):
    """Return the price list of data/price-list.json."""
    return json.loads(Path(path).read_text(encoding="utf-8"))


def list_value(price_list, plan_id, seats):
    """Return the annual list value of `seats` seats of the plan, in US dollars."""
    plans = price_list["plans"]
    if plan_id not in plans:
        raise ValueError(f"Unknown plan: {plan_id}")
    if seats < 1:
        raise ValueError("A contract has at least one seat")
    return plans[plan_id]["list_price"] * seats


def volume_discount(price_list, value):
    """Return the volume discount, in percent, for an annual list value."""
    percent = 0
    for tier in price_list["volume_discounts"]:
        if value > tier["from"]:
            percent = tier["percent"]
    return percent


def yearly_price(price_list, plan_id, seats):
    """Return the yearly price after volume discount, the list value and the discount."""
    value = list_value(price_list, plan_id, seats)
    percent = volume_discount(price_list, value)
    return value * (100 - percent) // 100, value, percent


def main(arguments):
    if len(arguments) != 2:
        print("Usage: quote.py <plan> <seats>", file=sys.stderr)
        return 2
    try:
        price, value, percent = yearly_price(load_price_list(), arguments[0], int(arguments[1]))
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print(f"${price:,} per year (list ${value:,}, {percent}% volume discount)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
