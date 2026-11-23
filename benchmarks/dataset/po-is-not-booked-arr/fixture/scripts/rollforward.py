"""Rolls ARR forward from one month to the next.

    python3 scripts/rollforward.py --opening 4720 --new 100 --expansion 45 --churn 30

Amounts are in thousands of US dollars. Prints each line of the roll-forward, then the net new ARR
and the ending ARR, written as the documents write amounts.
"""

import argparse
import sys


def net_new_arr(new=0, expansion=0, churn=0):
    """Return a month's net new ARR: new ARR and expansion, less churn."""
    return new + expansion - churn


def ending_arr(opening, new=0, expansion=0, churn=0):
    """Return the ARR at the end of a month."""
    return opening + net_new_arr(new, expansion, churn) - churn


def format_amount(amount, sign=False):
    """Return an amount in thousands as the documents write it, such as $4,720k, +$45k or -$30k."""
    text = f"${abs(amount):,}k"
    if amount < 0:
        return f"-{text}"
    return f"+{text}" if sign else text


def roll_forward(opening, new=0, expansion=0, churn=0):
    """Return the lines of the roll-forward as (label, amount) pairs."""
    return [
        ("Opening ARR", format_amount(opening)),
        ("New ARR", format_amount(new, sign=True)),
        ("Expansion", format_amount(expansion, sign=True)),
        ("Churn", format_amount(-churn)),
        ("Net new ARR", format_amount(net_new_arr(new, expansion, churn), sign=True)),
        ("Ending ARR", format_amount(ending_arr(opening, new, expansion, churn))),
    ]


def main(arguments):
    parser = argparse.ArgumentParser(description="Roll ARR forward by one month.")
    parser.add_argument("--opening", type=int, required=True, help="opening ARR, in thousands")
    parser.add_argument("--new", type=int, default=0, help="new ARR, in thousands")
    parser.add_argument("--expansion", type=int, default=0, help="expansion, in thousands")
    parser.add_argument("--churn", type=int, default=0, help="churn, in thousands")
    options = parser.parse_args(arguments)
    for label, amount in roll_forward(options.opening, options.new, options.expansion, options.churn):
        print(f"{label:<12} {amount:>9}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
