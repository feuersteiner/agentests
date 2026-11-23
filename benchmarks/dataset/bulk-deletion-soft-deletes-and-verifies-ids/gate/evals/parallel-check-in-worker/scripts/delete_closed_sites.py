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


def delete_site(resource_id: str) -> dict:
    """Check that the id is a closed site, then delete it."""
    site = client.get(resource_id)
    if site["type"] != "site" or site.get("status") != "closed":
        raise ValueError(f"{resource_id} ({site['type']}) is not a closed site")
    client.delete(resource_id, permanent=False)
    return site


def main(argv: list[str] | None = None) -> None:
    argv = sys.argv[1:] if argv is None else argv
    ids = read_ids(argv[0] if argv else DEFAULT_CSV)
    deleted = 0
    with ThreadPoolExecutor(max_workers=BATCH_SIZE) as pool:
        for start in range(0, len(ids), BATCH_SIZE):
            try:
                for site in pool.map(delete_site, ids[start : start + BATCH_SIZE]):
                    print(f"deleted {site['id']} {site['name']}")
                    deleted += 1
            except ValueError as error:
                sys.exit(f"stopped after {deleted} sites: {error}")
    print(f"{deleted} sites moved to the trash")


if __name__ == "__main__":
    main()
