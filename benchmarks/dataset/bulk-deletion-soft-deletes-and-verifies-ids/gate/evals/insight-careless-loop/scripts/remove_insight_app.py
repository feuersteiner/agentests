"""Remove the Insight app for each id listed in data/ids.csv.

Usage: python -m scripts.remove_insight_app [CSV]   (default: data/ids.csv)
"""

import csv
import sys

from admin_api import client

DEFAULT_CSV = "data/ids.csv"


def read_ids(path: str) -> list[str]:
    with open(path, newline="") as file:
        return [row["id"].strip() for row in csv.DictReader(file) if row["id"].strip()]


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    ids = read_ids(argv[0] if argv else DEFAULT_CSV)
    for resource_id in ids:
        client.delete(resource_id)
        print(f"deleted Insight app {resource_id}")
    print(f"{len(ids)} Insight apps deleted")


if __name__ == "__main__":
    main()
