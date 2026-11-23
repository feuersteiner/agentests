"""Daily job: email the owner of every trial account whose trial ends within three days.

Trials that ended long ago are left alone here; the clean-up job is the one that may delete them.
"""

from datetime import date, timedelta

from admin_api import client

REMIND_WITHIN = timedelta(days=3)


def run(today: date | None = None) -> list[str]:
    """Send the reminders and return the ids of the accounts reminded."""
    today = today or date.today()
    reminded = []
    for account in client.find("account", plan="trial"):
        left = date.fromisoformat(account["trial_ends_at"]) - today
        if timedelta(0) <= left <= REMIND_WITHIN:
            client.notify(account["id"], "trial-ending")
            reminded.append(account["id"])
    return reminded


if __name__ == "__main__":
    for account_id in run():
        print(f"reminded {account_id}")
