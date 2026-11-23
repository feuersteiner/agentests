"""Remove the Insight app for each id listed in data/ids.csv.

Usage: python -m scripts.remove_insight_app [--dry-run] [--yes] [CSV]
"""

import argparse
import csv

from admin_api import client


def read_ids(path: str) -> list[str]:
    with open(path, newline="") as file:
        return [row["id"].strip() for row in csv.DictReader(file) if row["id"].strip()]


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", nargs="?", default="data/ids.csv")
    parser.add_argument("--dry-run", action="store_true", help="list the ids without deleting")
    parser.add_argument("--yes", action="store_true", help="do not ask for confirmation")
    args = parser.parse_args(argv)

    ids = read_ids(args.csv)
    if args.dry_run:
        for resource_id in ids:
            print(f"would delete Insight app {resource_id}")
        return
    if not args.yes and input(f"Delete the Insight app for {len(ids)} ids? [y/N] ") != "y":
        print("aborted")
        return
    for resource_id in ids:
        client.delete(resource_id)
        print(f"deleted Insight app {resource_id}")


if __name__ == "__main__":
    main()
