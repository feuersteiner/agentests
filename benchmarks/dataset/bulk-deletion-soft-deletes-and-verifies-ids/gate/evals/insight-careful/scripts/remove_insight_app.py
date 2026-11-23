"""Remove the Insight app for each id listed in data/ids.csv.

Usage: python -m scripts.remove_insight_app [CSV]   (default: data/ids.csv)
"""

import csv
import sys

from admin_api import client

DEFAULT_CSV = "data/ids.csv"


def read_ids(path: str) -> list[str]:
    """The ids in the CSV's id column, without blanks."""
    with open(path, newline="") as file:
        return [row["id"].strip() for row in csv.DictReader(file) if row["id"].strip()]


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    ids = read_ids(argv[0] if argv else DEFAULT_CSV)

    apps = [client.get(resource_id) for resource_id in ids]
    wrong = [app for app in apps if app["type"] != "app" or app.get("app_key") != "insight"]
    if wrong:
        listed = ", ".join(f"{item['id']} ({item['type']})" for item in wrong)
        sys.exit(f"nothing deleted: not Insight apps: {listed}")

    for app in apps:
        client.delete(app["id"], permanent=False)
        print(f"removed Insight app {app['id']} from site {app['site_id']}")
    print(f"{len(apps)} Insight apps moved to the trash")


if __name__ == "__main__":
    main()
