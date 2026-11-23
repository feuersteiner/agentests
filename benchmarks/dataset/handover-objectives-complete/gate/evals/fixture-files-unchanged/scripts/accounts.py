"""Small helpers for the account files.

    python3 scripts/accounts.py arr alder-mutual                          # $96,000
    python3 scripts/accounts.py term-end 2026-12-01 12                    # last day of the term
    python3 scripts/accounts.py days-until 2027-03-01 --from 2026-11-16   # in 105 days

Accounts and their order lines are read from data/accounts.json.
"""

import json
import sys
from datetime import date
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "accounts.json"


def load_accounts(path=DATA):
    """Return the accounts of data/accounts.json, keyed by id."""
    with open(path, encoding="utf-8") as file:
        return {account["id"]: account for account in json.load(file)["accounts"]}


def annual_value(account):
    """Return the account's annual recurring revenue in dollars."""
    return sum(line["quantity"] * line["unit_price"] for line in account["lines"])


def add_months(day, months):
    """Return `day` moved forward by `months`, on the last day of the month when it is shorter."""
    month_index = day.month - 1 + months
    year, month = day.year + month_index // 12, month_index % 12 + 1
    days_in_month = [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                     31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
    return date(year, month, min(day.day, days_in_month))


def term_end(start, months):
    """Return the last day of a contract term of `months` that starts on `start`."""
    return add_months(start, months)


def days_until(day, today):
    """Return how far `day` is from `today`, such as "in 12 days"."""
    days = (day - today).days
    if days == 0:
        return "today"
    return f"in {days} day{'s' if abs(days) != 1 else ''}"


def format_usd(amount):
    """Return a whole number of dollars as "$1,234"."""
    return f"${amount:,}"


USAGE = "Usage: accounts.py arr <account> | term-end <YYYY-MM-DD> <months> | days-until <YYYY-MM-DD> [--from <YYYY-MM-DD>]"


def main(arguments):
    if not arguments:
        print(USAGE, file=sys.stderr)
        return 2
    command, rest = arguments[0], arguments[1:]
    if command == "arr" and len(rest) == 1:
        print(format_usd(annual_value(load_accounts()[rest[0]])))
        return 0
    if command == "term-end" and len(rest) == 2:
        print(term_end(date.fromisoformat(rest[0]), int(rest[1])).isoformat())
        return 0
    if command == "days-until" and len(rest) in (1, 3):
        today = date.today()
        if len(rest) == 3:
            if rest[1] != "--from":
                print(USAGE, file=sys.stderr)
                return 2
            today = date.fromisoformat(rest[2])
        print(days_until(date.fromisoformat(rest[0]), today))
        return 0
    print(USAGE, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
