"""The charges a subscription produces."""

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
    """The same day next month."""
    if last_charge_on.month == 12:
        return last_charge_on.replace(year=last_charge_on.year + 1, month=1)
    return last_charge_on.replace(month=last_charge_on.month + 1)


def next_charge(subscription: Subscription, last: Charge) -> Charge:
    """A monthly subscription's next charge."""
    plan = PLANS[subscription.plan]
    return Charge(subscription.id, next_charge_date(last.due_on), plan.monthly_price_pence)
