"""The yearly price of a Larkspur package for a number of seats, after volume discount.

    python3 scripts/quote.py standard 50

Prices, seat minimums and the volume discount ladder come from data/packages.json.
"price_per_seat" is the list price of one seat for one year. The volume discount is the percent
of the highest tier whose "from" the annual list value reaches.
"""

import json
import sys
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "packages.json"


def load_data(path=DATA_FILE):
    """Return the contents of data/packages.json."""
    return json.loads(Path(path).read_text(encoding="utf-8"))


def volume_discount(data, list_value):
    """Return the volume discount, in percent, for an annual list value."""
    percent = 0
    for tier in data["volume_discounts"]:
        if list_value > tier["from"]:
            percent = tier["percent"]
    return percent


def yearly_price(data, package_id, seats):
    """Return the yearly price after volume discount, the list value and the discount."""
    package = data["packages"][package_id]
    if seats < 1:
        raise ValueError("A contract has at least one seat")
    list_value = package["price_per_seat"] * seats
    percent = volume_discount(data, list_value)
    return list_value * (100 - percent) // 100, list_value, percent


def main(arguments):
    if len(arguments) != 2:
        print("Usage: quote.py <package> <seats>", file=sys.stderr)
        return 2
    try:
        price, list_value, percent = yearly_price(load_data(), arguments[0], int(arguments[1]))
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print(f"${price:,} per year (list ${list_value:,}, {percent}% volume discount)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
