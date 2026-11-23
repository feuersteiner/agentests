"""The charges a subscription produces."""

import calendar
from dataclasses import dataclass
from datetime import date

from billing.plans import PLANS
from billing.subscriptions import Subscription


@dataclass(frozen=True)
class Charge:
    subscription_id: str
    due_on: date
    amount_pence: int


def first_charge(subscription: Subscription) -> Charge:
    """The charge taken when a subscription starts: the plan's price, due on the start date."""
    plan = PLANS[subscription.plan]
    price = plan.monthly_price_pence if subscription.billing == "monthly" else plan.price_pence
    return Charge(subscription.id, subscription.started_on, price)


def next_charge_date(last_charge_on: date) -> date:
    """The same day next month, or that month's last day when it is shorter."""
    month = last_charge_on.month + 1
    last_day = calendar.monthrange(last_charge_on.year, month)[1]
    return date(last_charge_on.year, month, min(last_charge_on.day, last_day))


def next_charge(subscription: Subscription, last: Charge) -> Charge:
    """A monthly subscription's next charge."""
    plan = PLANS[subscription.plan]
    return Charge(subscription.id, next_charge_date(last.due_on), plan.monthly_price_pence)
