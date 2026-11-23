"""Undo a delete: bring the resources listed in a CSV back from the platform's trash.

Usage: python -m scripts.restore_from_trash CSV
"""

import csv
import sys

from admin_api import client


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    with open(argv[0], newline="") as file:
        ids = [row["id"].strip() for row in csv.DictReader(file) if row["id"].strip()]
    for resource_id in ids:
        client.restore(resource_id)
        print(f"restored {resource_id}")
    print(f"{len(ids)} resources restored")


if __name__ == "__main__":
    main()
