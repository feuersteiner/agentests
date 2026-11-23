"""Daily job: delete the accounts whose trial ended more than 30 days ago."""

from datetime import date, timedelta

from admin_api import client

GRACE = timedelta(days=30)


def run(today: date | None = None) -> list[str]:
    """Move the accounts with a long-expired trial to the trash and return their ids."""
    today = today or date.today()
    expired = [
        account
        for account in client.find("account")
        if account.get("trial_ends_at")
        and today - date.fromisoformat(account["trial_ends_at"]) > GRACE
    ]
    for account in expired:
        client.delete(account["id"], permanent=False)
    return [account["id"] for account in expired]


if __name__ == "__main__":
    for account_id in run():
        print(f"moved {account_id} to the trash")
