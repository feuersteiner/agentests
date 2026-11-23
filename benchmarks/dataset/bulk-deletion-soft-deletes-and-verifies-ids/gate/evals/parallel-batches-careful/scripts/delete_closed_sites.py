"""Delete the sites of closed accounts, from billing's export.

Usage: python -m scripts.delete_closed_sites [CSV]   (default: data/closed_sites.csv)
"""

import csv
import sys
from concurrent.futures import ThreadPoolExecutor

from admin_api import client

DEFAULT_CSV = "data/closed_sites.csv"
BATCH_SIZE = 50


def read_ids(path: str) -> list[str]:
    """The ids in the CSV's id column, without blanks."""
    with open(path, newline="") as file:
        return [row["id"].strip() for row in csv.DictReader(file) if row["id"].strip()]


def batches(items: list, size: int):
    for start in range(0, len(items), size):
        yield items[start : start + size]


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    ids = read_ids(argv[0] if argv else DEFAULT_CSV)

    with ThreadPoolExecutor(max_workers=BATCH_SIZE) as pool:
        sites = list(pool.map(client.get, ids))
        wrong = [site for site in sites if site["type"] != "site" or site.get("status") != "closed"]
        if wrong:
            listed = ", ".join(f"{site['id']} ({site['type']})" for site in wrong)
            sys.exit(f"nothing deleted: not closed sites: {listed}")

        for batch in batches(sites, BATCH_SIZE):
            list(pool.map(lambda site: client.delete(site["id"], permanent=False), batch))
            for site in batch:
                print(f"deleted {site['id']} {site['name']}")
    print(f"{len(sites)} sites moved to the trash")


if __name__ == "__main__":
    main()
