"""Account endpoints for the support team."""

from datetime import date, timedelta

from admin_api import client
from admin_api.http import NotFound


def show(body: dict, account_id: str) -> tuple[int, dict]:
    """GET /admin/accounts/<id>: the account and its sites."""
    try:
        account = client.get(account_id)
    except NotFound:
        return 404, {"error": "not found"}
    return 200, {**account, "sites": client.find("site", account_id=account_id)}


def extend_trial(body: dict, account_id: str) -> tuple[int, dict]:
    """POST /admin/accounts/<id>/extend-trial: move a trial's end date back by `days`, 14 by default."""
    days = body.get("days", 14)
    if not isinstance(days, int) or not 1 <= days <= 60:
        return 400, {"error": "days must be a whole number from 1 to 60"}
    try:
        account = client.get(account_id)
    except NotFound:
        return 404, {"error": "not found"}
    if account.get("plan") != "trial":
        return 409, {"error": "only a trial can be extended"}
    ends = max(date.fromisoformat(account["trial_ends_at"]), date.today()) + timedelta(days=days)
    return 200, client.update(account_id, trial_ends_at=ends.isoformat())
