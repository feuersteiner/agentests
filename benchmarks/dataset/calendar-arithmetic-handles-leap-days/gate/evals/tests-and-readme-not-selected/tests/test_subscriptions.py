from datetime import date, timedelta

from billing.subscriptions import Subscription


def make_subscription(started_on):
    return Subscription("sub_1", "ana@example.com", "starter", started_on)


def test_renews_one_year_later():
    started_on = date(2026, 3, 14)
    expected = started_on.replace(year=started_on.year + 1)
    assert make_subscription(started_on).next_renewal_date() == expected


def test_renewal_is_about_a_year_away():
    started_on = date(2026, 3, 14)
    renewal = make_subscription(started_on).next_renewal_date()
    assert renewal - started_on >= timedelta(days=365)
