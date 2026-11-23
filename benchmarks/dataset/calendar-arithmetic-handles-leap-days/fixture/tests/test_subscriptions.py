from datetime import date

from billing.subscriptions import Subscription


def make_subscription(**changes):
    fields = {
        "id": "sub_1",
        "customer_email": "ana@example.com",
        "plan": "starter",
        "started_on": date(2026, 3, 14),
    }
    fields.update(changes)
    return Subscription(**fields)


def test_subscriptions_renew_automatically_by_default():
    assert make_subscription().auto_renew is True


def test_started_on_is_kept():
    assert make_subscription(started_on=date(2025, 9, 10)).started_on == date(2025, 9, 10)
