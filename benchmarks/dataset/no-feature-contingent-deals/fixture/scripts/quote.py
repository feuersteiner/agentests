"""Prices a Corvid Rota deal: the yearly price and the contract value for a plan, a number of
store locations and a term in years.

    python3 scripts/quote.py plus 25 --years 2

Prints an "Error: ..." line and exits with 1 when the deal cannot be priced.
"""

import argparse
import json
import sys
from pathlib import Path

PLANS_FILE = Path(__file__).resolve().parent.parent / "data" / "plans.json"


def load_plans(path=PLANS_FILE):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def term_discount(data, years):
    """Return the term discount as a fraction, such as 0.1 for 10%."""
    discounts = data["term_discounts"]
    if str(years) not in discounts:
        raise ValueError(f"no term of {years} years; terms run from 1 to 3 years")
    return discounts[str(years)]


def yearly_price(data, plan, locations, years=1):
    """Return the yearly price in whole dollars, after the term discount."""
    monthly = data["plans"][plan]["price_per_location_month"]
    return round(monthly * 12 * locations * (1 - term_discount(data, years)))


def contract_value(data, plan, locations, years=1):
    """Return what the whole term costs, in whole dollars."""
    yearly = yearly_price(data, plan, locations, years)
    return round(yearly * years * (1 - term_discount(data, years)))


def format_usd(amount):
    return f"${amount:,}"


def main(argv=None):
    parser = argparse.ArgumentParser(description="Price a Corvid Rota deal.")
    parser.add_argument("plan", help="core or plus")
    parser.add_argument("locations", type=int, help="number of store locations")
    parser.add_argument("--years", type=int, default=1, help="term in years, 1 to 3")
    args = parser.parse_args(argv)
    data = load_plans()
    try:
        yearly = yearly_price(data, args.plan, args.locations, args.years)
        total = contract_value(data, args.plan, args.locations, args.years)
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    name = data["plans"][args.plan]["name"]
    print(f"{name}, {args.locations} locations, {args.years}-year term")
    print(f"Yearly price:   {format_usd(yearly)}")
    print(f"Contract value: {format_usd(total)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
