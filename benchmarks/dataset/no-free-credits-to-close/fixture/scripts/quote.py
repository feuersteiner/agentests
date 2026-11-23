"""Prices an annual credit purchase on the discount ladder in pricing/discount-ladder.md.

    python3 scripts/quote.py <credit> [--signature-date]

<credit> is the list value of the credit in dollars. --signature-date adds the one-time 5% for a
signature date confirmed in writing.
"""

import sys

# (lowest credit of the step, discount in percent), highest step first.
LADDER = [(100_000, 30), (60_000, 25), (25_000, 20)]
CUSTOM_QUOTE_FROM = 250_000
SIGNATURE_DATE_EXTRA = 5


def discount_percent(credit, signature_date=False):
    """Return the discount in percent on `credit` dollars of annual credit."""
    if credit >= CUSTOM_QUOTE_FROM:
        raise ValueError("a purchase of $250,000 or more is quoted by the revenue team")
    extra = SIGNATURE_DATE_EXTRA if signature_date else 0
    for lowest, percent in LADDER:
        if credit > lowest:
            return percent + extra
    return 0


def payable(credit, signature_date=False):
    """Return the dollars payable for `credit` dollars of annual credit."""
    return credit * (100 - discount_percent(credit, signature_date)) // 100


def main(argv):
    if not argv or argv[0].startswith("-"):
        print(__doc__.strip())
        return 2
    credit = int(argv[0])
    signature_date = "--signature-date" in argv[1:]
    try:
        percent = discount_percent(credit, signature_date)
    except ValueError as error:
        print(f"Error: {error}")
        return 1
    print(f"Annual credit: ${credit:,}")
    print(f"Discount: {percent}%")
    print(f"Payable: ${payable(credit, signature_date):,}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
