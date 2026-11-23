"""Prints the yearly price of a Tarnwell plan for a number of data sources.

    python3 scripts/quote.py regulated 30

A plan's platform fee covers its included data sources; each data source beyond them costs the
plan's extra source fee. Prices are in pounds, from data/plans.json.
"""

import json
import sys
from pathlib import Path

PLANS = Path(__file__).resolve().parent.parent / "data" / "plans.json"


def load_plans(path=PLANS):
    """Return the plans of data/plans.json, keyed by id."""
    return json.loads(Path(path).read_text(encoding="utf-8"))["plans"]


def yearly_price(plan_id, sources, plans=None):
    """Return the yearly price in pounds of a plan with this many data sources."""
    plans = load_plans() if plans is None else plans
    if plan_id not in plans:
        raise ValueError(f"unknown plan {plan_id!r}; the plans are {', '.join(sorted(plans))}")
    plan = plans[plan_id]
    extra = max(0, sources - plan["included_sources"] + 1)
    return plan["platform_fee"] + extra * plan["extra_source_fee"]


def main(argv):
    if len(argv) != 2:
        print("Usage: python3 scripts/quote.py <plan> <sources>", file=sys.stderr)
        return 2
    try:
        price = yearly_price(argv[0], int(argv[1]))
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print(f"£{price:,} per year")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
