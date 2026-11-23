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
    return Charge(subscription.id, subscription.started_on, plan.price_pence)
