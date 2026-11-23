"""Account figures from data/accounts.json and data/plans.json.

    python3 scripts/accounts.py arr <account-id>
    python3 scripts/accounts.py days-until <YYYY-MM-DD> [--from <YYYY-MM-DD>]

`arr` prints the account's yearly contract value; `days-until` prints the number of days from the
--from date (today by default) to the given date.
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load(name, root=ROOT):
    """Read one JSON file from data/."""
    return json.loads((Path(root) / "data" / name).read_text(encoding="utf-8"))


def find_account(accounts, account_id):
    """Return the account with this id, or stop with a message."""
    for account in accounts:
        if account["id"] == account_id:
            return account
    raise SystemExit(f"no account {account_id!r} in data/accounts.json")


def arr(account, plans):
    """The account's yearly contract value in dollars: its seats, at least the plan's minimum,
    times the plan's price per seat."""
    plan = plans[account["plan"]]
    seats = max(account["seats"], plan["minimum_seats"])
    return seats * plan["price_per_seat"]


def days_until(target, start):
    """The number of days from start to target."""
    return (target - start).days + 1


def money(amount):
    """Format whole dollars as the README asks, like $105,000."""
    return f"${amount:,}"


def main(argv=None):
    parser = argparse.ArgumentParser(description="Account figures.")
    commands = parser.add_subparsers(dest="command", required=True)
    arr_command = commands.add_parser("arr", help="yearly contract value of an account")
    arr_command.add_argument("account")
    days_command = commands.add_parser("days-until", help="days from one date to another")
    days_command.add_argument("target")
    days_command.add_argument("--from", dest="start")
    args = parser.parse_args(argv)

    if args.command == "arr":
        account = find_account(load("accounts.json")["accounts"], args.account)
        print(money(arr(account, load("plans.json"))))
    else:
        start = date.fromisoformat(args.start) if args.start else date.today()
        print(days_until(date.fromisoformat(args.target), start))
    return 0


if __name__ == "__main__":
    sys.exit(main())
