"""The yearly list cost of a monthly usage forecast, from data/prices.json.

    python3 scripts/quote.py --events 80000000 --recordings 90000 --warehouse-gb 200

Volumes are per month. The result is what twelve months of that usage cost at list prices, which
is also the list value of the usage credit that covers them.
"""

import argparse
import json
import sys
from pathlib import Path

PRICES_FILE = Path(__file__).resolve().parent.parent / "data" / "prices.json"


def load_prices(path=PRICES_FILE):
    """Return the products of data/prices.json, keyed by product id."""
    return json.loads(Path(path).read_text(encoding="utf-8"))["products"]


def monthly_cost(prices, volumes):
    """Return the list cost of one month of usage, in US dollars.

    `volumes` maps product ids to monthly volumes.
    """
    total = 0
    for product_id, volume in volumes.items():
        if volume < 0:
            raise ValueError(f"A volume cannot be negative: {product_id} {volume}")
        product = prices[product_id]
        total += volume / product["unit"] * product["price"]
    return total


def yearly_cost(prices, volumes):
    """Return the list cost of twelve months of the same monthly usage, in US dollars."""
    return monthly_cost(prices, volumes) * 12


def parse_volumes(arguments):
    """Return the monthly volumes given on the command line, keyed by product id."""
    parser = argparse.ArgumentParser(description="Yearly list cost of a monthly usage forecast.")
    parser.add_argument("--events", type=int, default=0, help="events per month")
    parser.add_argument("--recordings", type=int, default=0, help="session recordings per month")
    parser.add_argument("--warehouse-gb", type=int, default=0, help="GB synced per month")
    options = parser.parse_args(arguments)
    return {
        "events": options.events,
        "recordings": options.recordings,
        "warehouse_gb": options.warehouse_gb,
    }


def main(arguments):
    try:
        cost = yearly_cost(load_prices(), parse_volumes(arguments))
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print(f"${cost:,.0f} a year at list prices")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
