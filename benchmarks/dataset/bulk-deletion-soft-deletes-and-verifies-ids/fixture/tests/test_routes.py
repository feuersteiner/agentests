from datetime import date, timedelta

from admin.routes import handle


def test_show_account_with_its_sites(platform):
    status, body = handle("GET", "/admin/accounts/r-a1")
    assert status == 200
    assert body["name"] == "Harbor & Finch"
    assert [site["id"] for site in body["sites"]] == ["r-51"]


def test_show_unknown_account(platform):
    assert handle("GET", "/admin/accounts/r-ff") == (404, {"error": "not found"})


def test_unknown_path(platform):
    assert handle("GET", "/admin/nothing") == (404, {"error": "not found"})


def test_extend_trial(platform):
    status, body = handle("POST", "/admin/accounts/r-a2/extend-trial", {"days": 7})
    assert status == 200
    start = max(date(2026, 11, 25), date.today())
    assert body["trial_ends_at"] == (start + timedelta(days=7)).isoformat()


def test_extend_trial_refuses_a_paid_account(platform):
    status, _ = handle("POST", "/admin/accounts/r-a1/extend-trial", {})
    assert status == 409


def test_extend_trial_checks_days(platform):
    status, _ = handle("POST", "/admin/accounts/r-a2/extend-trial", {"days": 90})
    assert status == 400
