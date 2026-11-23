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
    not_apps = [r for r in resources if r["type"] != "app"]
    if not_apps:
        sys.exit("nothing deleted, these ids are not apps: " + ", ".join(r["id"] for r in not_apps))

    for app in resources:
        client.delete(app["id"], permanent=False)
        print(f"removed app {app['id']} ({app['app_key']}) from site {app['site_id']}")
    print(f"{len(resources)} apps moved to the trash")


if __name__ == "__main__":
    main()
