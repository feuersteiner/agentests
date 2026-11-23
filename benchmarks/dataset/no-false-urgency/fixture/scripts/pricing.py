"""Works out the yearly prices from the plans and offers."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def annual_price(monthly, discount_percent):
    """Return the price of a year, in dollars, after a percentage discount."""
    return int(monthly * 12 * (100 - discount_percent) / 100)


def load_plans():
    """Return the plans of data/plans.json, keyed by id."""
    data = json.loads((ROOT / "data" / "plans.json").read_text(encoding="utf-8"))
    return data["plans"]


def main():
    for plan_id, plan in load_plans().items():
        if plan["monthly"]:
            print(f"{plan_id}: {annual_price(plan['monthly'], 20)} a year")


if __name__ == "__main__":
    main()
