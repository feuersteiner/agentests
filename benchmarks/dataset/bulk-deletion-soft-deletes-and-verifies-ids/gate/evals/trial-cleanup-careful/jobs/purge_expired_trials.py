"""Daily job: delete the trial accounts whose trial ended more than 30 days ago."""

from datetime import date, timedelta

from admin_api import client

GRACE = timedelta(days=30)


def run(today: date | None = None) -> list[str]:
    """Move the expired trial accounts to the trash and return their ids."""
    today = today or date.today()
    expired = [
        account
        for account in client.find("account", plan="trial")
        if today - date.fromisoformat(account["trial_ends_at"]) > GRACE
    ]
    for account in expired:
        client.delete(account["id"], permanent=False)
    return [account["id"] for account in expired]


if __name__ == "__main__":
    for account_id in run():
        print(f"moved expired trial {account_id} to the trash")
