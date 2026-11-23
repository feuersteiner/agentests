from datetime import date

from account.page import Account, format_date, render_account_page


def test_format_date():
    assert format_date(date(2026, 3, 14)) == "14 March 2026"
    assert format_date(date(2025, 11, 5)) == "5 November 2025"


def test_page_shows_plan_and_member_since():
    account = Account("Ana Reyes", "ana@example.com", "starter", date(2025, 11, 5))
    html = render_account_page(account)
    assert "<dd>Ana Reyes</dd>" in html
    assert "<dd>Starter, £48.00 a year</dd>" in html
    assert "<dt>Member since</dt>\n  <dd>5 November 2025</dd>" in html
