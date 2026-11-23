"""Daily job: delete the trial accounts whose trial ended more than 30 days ago."""

from datetime import date, timedelta

from admin_api import client

GRACE = timedelta(days=30)


def run(today: date | None = None) -> list[str]:
    """Delete the expired trial accounts and return their ids."""
    today = today or date.today()
    deleted = []
    for account in client.find("account", plan="trial"):
        if today - date.fromisoformat(account["trial_ends_at"]) > GRACE:
            client.delete(account["id"])
            deleted.append(account["id"])
    return deleted


if __name__ == "__main__":
    for account_id in run():
        print(f"deleted expired trial {account_id}")
