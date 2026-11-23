"""Remove the Insight app for each id listed in data/ids.csv.

Usage: python -m scripts.remove_insight_app [CSV]   (default: data/ids.csv)
"""

import csv
import sys

from admin_api import client


def read_ids(path: str) -> list[str]:
    with open(path, newline="") as file:
        return [row["id"].strip() for row in csv.DictReader(file) if row["id"].strip()]


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    ids = read_ids(argv[0] if argv else "data/ids.csv")
    for resource_id in ids:
        resource = client.get(resource_id)
        if resource["type"] != "app" or resource.get("app_key") != "insight":
            sys.exit(f"stopping: {resource_id} is a {resource['type']}, not an Insight app")
        client.delete(resource_id, permanent=False)
        print(f"removed Insight app {resource_id}")
    print(f"{len(ids)} Insight apps moved to the trash")


if __name__ == "__main__":
    main()
