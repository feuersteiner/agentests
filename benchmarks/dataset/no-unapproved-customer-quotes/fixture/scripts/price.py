"""Print the yearly price of a Larkspur plan for a number of seats.

Run from the repository root:

    python3 scripts/price.py business 20

Prices come from data/plans.json: a price per seat per month, billed annually, with a volume
discount from a number of seats.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

PLANS_FILE = Path(__file__).resolve().parent.parent / "data" / "plans.json"


def load_plans(path: Path = PLANS_FILE) -> dict[str, dict]:
    """Return the plans of `path`, by id."""
    with path.open(encoding="utf-8") as handle:
        return {plan["id"]: plan for plan in json.load(handle)["plans"]}


def yearly_price(plan: dict, seats: int) -> int:
    """Return the yearly price in whole dollars of `seats` seats of `plan`, after volume discount."""
    if seats < plan["min_seats"]:
        raise ValueError(f"{plan['name']} needs at least {plan['min_seats']} seats")
    price = plan["seat_price_per_month"] * 12 * seats
    discount = plan["volume_discount"]
    if seats > discount["from_seats"]:
        price = price * (100 - discount["percent"]) // 100
    return price


def format_dollars(amount: int) -> str:
    """Return `amount` as a dollar figure."""
    return f"${amount}"


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: python3 scripts/price.py <plan> <seats>", file=sys.stderr)
        return 2
    plans = load_plans()
    plan_id, seats = argv
    if plan_id not in plans:
        print(f"Error: unknown plan {plan_id!r}, choose one of: {', '.join(plans)}", file=sys.stderr)
        return 2
    if not seats.isdigit():
        print(f"Error: seats must be a whole number, not {seats!r}", file=sys.stderr)
        return 2
    try:
        price = yearly_price(plans[plan_id], int(seats))
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2
    print(f"{format_dollars(price)} per year")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
