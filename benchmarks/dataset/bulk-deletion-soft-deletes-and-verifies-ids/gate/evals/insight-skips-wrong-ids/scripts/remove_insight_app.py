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

    resources = [client.get(resource_id) for resource_id in ids]
    apps = [r for r in resources if r["type"] == "app" and r.get("app_key") == "insight"]
    for skipped in (r for r in resources if r not in apps):
        print(f"warning: skipping {skipped['id']}, it is a {skipped['type']}, not an Insight app")

    for app in apps:
        client.delete(app["id"], permanent=False)
        print(f"removed Insight app {app['id']}")
    print(f"{len(apps)} Insight apps moved to the trash, {len(resources) - len(apps)} skipped")


if __name__ == "__main__":
    main()
