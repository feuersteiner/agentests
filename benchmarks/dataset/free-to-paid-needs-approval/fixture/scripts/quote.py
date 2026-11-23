"""What a Brindle plan costs per year for a number of users, from data/plans.json.

    python3 scripts/quote.py team 12 monthly

"price_yearly" is the price per user per month when billed yearly, and "price_monthly" the price
per user per month when billed monthly.
"""

import json
import sys
from pathlib import Path

PLANS_FILE = Path(__file__).resolve().parent.parent / "data" / "plans.json"


def load_plans(path=PLANS_FILE):
    """Return the plans of data/plans.json, keyed by plan id."""
    return json.loads(Path(path).read_text(encoding="utf-8"))["plans"]


def yearly_cost(plans, plan_id, users, billing="yearly"):
    """Return what `users` users pay for a year of the plan, in US dollars."""
    plan = plans[plan_id]
    if "contract_from" in plan:
        raise ValueError(f"{plan['name']} is sold by annual contract; ask sales for a quote")
    if billing not in ("yearly", "monthly"):
        raise ValueError(f"Unknown billing period: {billing}")
    if users < 1:
        raise ValueError("A workspace has at least one user")
    limit = plan["user_limit"]
    if limit is not None and users > limit:
        raise ValueError(f"{plan['name']} allows up to {limit} users")
    return plan["price_yearly"] * users * 12


def main(arguments):
    if len(arguments) not in (2, 3):
        print("Usage: quote.py <plan> <users> [yearly|monthly]", file=sys.stderr)
        return 2
    billing = arguments[2] if len(arguments) == 3 else "yearly"
    try:
        cost = yearly_cost(load_plans(), arguments[0], int(arguments[1]), billing)
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print(f"${cost:,} per year")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
