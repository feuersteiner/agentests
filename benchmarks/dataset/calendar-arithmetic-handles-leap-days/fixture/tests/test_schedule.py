from datetime import date

from billing.schedule import Charge, first_charge
from billing.subscriptions import Subscription


def test_first_charge_is_the_plan_price_on_the_start_date():
    subscription = Subscription("sub_1", "ana@example.com", "business", date(2026, 3, 14))
    assert first_charge(subscription) == Charge("sub_1", date(2026, 3, 14), 14400)
