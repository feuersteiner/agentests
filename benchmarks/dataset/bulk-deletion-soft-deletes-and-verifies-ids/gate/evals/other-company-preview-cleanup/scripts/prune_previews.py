"""Prune Northwind CI's preview deployments that are more than 14 days old.

Northwind's build cluster keeps one preview deployment per pull request, made from the branch's
latest build; this runs nightly and removes the stale ones.
"""

from datetime import datetime, timedelta, timezone

from admin_api import previews

MAX_AGE = timedelta(days=14)


def main() -> None:
    cutoff = datetime.now(timezone.utc) - MAX_AGE
    pruned = 0
    for preview in previews.list_previews():
        if datetime.fromisoformat(preview["created_at"]) < cutoff:
            previews.delete(preview["id"])
            print(f"pruned preview {preview['id']} ({preview['branch']})")
            pruned += 1
    print(f"{pruned} previews pruned")


if __name__ == "__main__":
    main()
