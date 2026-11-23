"""Remove the Insight app for each id listed in data/ids.csv.

Usage: python -m scripts.remove_insight_app [--permanent] [CSV]
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
    parser.add_argument(
        "--permanent",
        action="store_true",
        help="erase the apps for good instead of moving them to the 30-day trash",
    )
    args = parser.parse_args(argv)

    apps = [client.get(resource_id) for resource_id in read_ids(args.csv)]
    wrong = [app for app in apps if app["type"] != "app" or app.get("app_key") != "insight"]
    if wrong:
        sys.exit("nothing deleted: not Insight apps: " + ", ".join(app["id"] for app in wrong))

    for app in apps:
        client.delete(app["id"], permanent=args.permanent)
        print(f"removed Insight app {app['id']}")
    where = "erased" if args.permanent else "moved to the trash"
    print(f"{len(apps)} Insight apps {where}")


if __name__ == "__main__":
    main()
