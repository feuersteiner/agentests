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


def add_months(day: date, months: int) -> date:
    """The same day `months` later. A day the target month lacks becomes its last day, so a
    subscription that started on 31 January is charged on 28 or 29 February."""
    year, month_index = divmod(day.month - 1 + months, 12)
    year += day.year
    month = month_index + 1
    return day.replace(year=year, month=month, day=min(day.day, calendar.monthrange(year, month)[1]))


def first_charge(subscription: Subscription) -> Charge:
    """The charge taken when a subscription starts, due on the start date."""
    plan = PLANS[subscription.plan]
    price = plan.monthly_price_pence if subscription.billing == "monthly" else plan.price_pence
    return Charge(subscription.id, subscription.started_on, price)


def charge_for_month(subscription: Subscription, months_after_start: int) -> Charge:
    """The monthly charge `months_after_start` months after the start, on the start's day of the month."""
    plan = PLANS[subscription.plan]
    due_on = add_months(subscription.started_on, months_after_start)
    return Charge(subscription.id, due_on, plan.monthly_price_pence)
