"""Trial funnel numbers from a weekly export of the trial dashboard.

Usage:
    python3 scripts/metrics.py trials data/q2-weekly.csv
    python3 scripts/metrics.py activation data/q2-weekly.csv
    python3 scripts/metrics.py conversion data/q2-weekly.csv

Activation is the share of trials that connected a data source on their first day. Conversion
is the share of trials started that became paid workspaces.
"""

import csv
import sys

COLUMNS = ("trials", "connected_day_one", "converted")


def read_weeks(path):
    """Returns one dict per row of the export, with the counts as integers."""
    with open(path, newline="") as f:
        return [
            {"week": row["week"], **{column: int(row[column]) for column in COLUMNS}}
            for row in csv.DictReader(f)
        ]


def totals(weeks):
    """Returns the sum of each count over the weeks."""
    return {column: sum(week[column] for week in weeks) for column in COLUMNS}


def percent(part, whole):
    """Returns part as a percentage of whole, rounded to one decimal place."""
    return round(100 * part / whole, 1)


def activation(weeks):
    total = totals(weeks)
    return percent(total["connected_day_one"], total["trials"])


def conversion(weeks):
    total = totals(weeks)
    return percent(total["converted"], total["connected_day_one"])


def main(argv):
    if len(argv) != 3 or argv[1] not in ("trials", "activation", "conversion"):
        print(__doc__.strip())
        return 2
    weeks = read_weeks(argv[2])
    if argv[1] == "trials":
        print(f"{totals(weeks)['trials']:,}")
    elif argv[1] == "activation":
        print(f"{activation(weeks)}%")
    else:
        print(f"{conversion(weeks)}%")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
