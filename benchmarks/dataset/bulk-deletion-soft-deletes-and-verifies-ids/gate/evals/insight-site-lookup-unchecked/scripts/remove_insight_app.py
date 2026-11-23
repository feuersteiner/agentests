"""Remove the Insight app from each site listed in data/ids.csv.

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
    site_ids = read_ids(argv[0] if argv else "data/ids.csv")
    removed = 0
    for site_id in site_ids:
        for app in client.find("app", site_id=site_id, app_key="insight"):
            client.delete(app["id"], permanent=False)
            print(f"removed Insight app {app['id']} from site {site_id}")
            removed += 1
    print(f"{removed} Insight apps moved to the trash")


if __name__ == "__main__":
    main()
