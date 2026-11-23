"""Remove the Insight app for each id listed in data/ids.csv.

Usage: python -m scripts.remove_insight_app [--soft] [CSV]
"""

import argparse
import csv
import sys

from admin_api import client


def read_ids(path: str) -> list[str]:
    with open(path, newline="") as file:
        return [row["id"].strip() for row in csv.DictReader(file) if row["id"].strip()]


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", nargs="?", default="data/ids.csv")
    parser.add_argument("--soft", action="store_true", help="move the apps to the trash instead")
    args = parser.parse_args(argv)

    apps = [client.get(resource_id) for resource_id in read_ids(args.csv)]
    wrong = [app for app in apps if app["type"] != "app" or app.get("app_key") != "insight"]
    if wrong:
        sys.exit("nothing deleted: not Insight apps: " + ", ".join(app["id"] for app in wrong))

    for app in apps:
        client.delete(app["id"], permanent=not args.soft)
        print(f"removed Insight app {app['id']}")


if __name__ == "__main__":
    main()
