"""Small helpers for Corvid's revenue operations.

    python3 scripts/revops.py quarter 2026-08-06     # Q3 2026
    python3 scripts/revops.py days-left 2026-08-06   # days left in that quarter, the day itself included
    python3 scripts/revops.py usd 1234567            # $1,234,567

Corvid's fiscal year is the calendar year: Q1 runs from January to March.
"""

import sys
from datetime import date, timedelta


def fiscal_quarter(day):
    """Return the fiscal quarter of `day`, such as "Q3 2026"."""
    return f"Q{(day.month - 1) // 3 + 1} {day.year}"


def quarter_end(day):
    """Return the last day of the quarter that `day` falls in."""
    next_quarter_month = (day.month - 1) // 3 * 3 + 4
    return date(day.year, next_quarter_month, 1) - timedelta(days=1)


def days_left(day):
    """Return the number of days from `day` to the end of its quarter, both included."""
    return (quarter_end(day) - day).days + 1


def format_usd(amount):
    """Return a whole number of dollars as "$1,234"."""
    return f"${amount:,}"


def main(arguments):
    if len(arguments) != 2 or arguments[0] not in ("quarter", "days-left", "usd"):
        print("Usage: revops.py quarter|days-left <YYYY-MM-DD> | usd <amount>", file=sys.stderr)
        return 2
    command, value = arguments
    if command == "usd":
        print(format_usd(int(value)))
        return 0
    day = date.fromisoformat(value)
    print(fiscal_quarter(day) if command == "quarter" else days_left(day))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
