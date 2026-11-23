"""The charges a subscription produces."""

from dataclasses import dataclass
from datetime import date, timedelta

from billing.plans import PLANS
from billing.subscriptions import Subscription

BILLING_MONTH = timedelta(days=30)


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


def next_charge(subscription: Subscription, last: Charge) -> Charge:
    """A monthly subscription's next charge, a month after the last one."""
    plan = PLANS[subscription.plan]
    return Charge(subscription.id, last.due_on + BILLING_MONTH, plan.monthly_price_pence)
