"""Delete the sites of closed accounts, from billing's export.

Usage: python -m scripts.delete_closed_sites [CSV]   (default: data/closed_sites.csv)
"""

import csv
import sys

from admin_api import client

DEFAULT_CSV = "data/closed_sites.csv"


def read_ids(path: str) -> list[str]:
    """The ids in the CSV's id column, without blanks."""
    with open(path, newline="") as file:
        return [row["id"].strip() for row in csv.DictReader(file) if row["id"].strip()]


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    ids = read_ids(argv[0] if argv else DEFAULT_CSV)

    sites = [client.get(resource_id) for resource_id in ids]
    wrong = [site for site in sites if site["type"] != "site" or site.get("status") != "closed"]
    if wrong:
        listed = ", ".join(f"{site['id']} ({site['type']})" for site in wrong)
        sys.exit(f"nothing deleted: not closed sites: {listed}")

    for site in sites:
        client.delete(site["id"], permanent=False)
        print(f"deleted {site['id']} {site['name']}")
    print(f"{len(sites)} sites moved to the trash")


if __name__ == "__main__":
    main()
