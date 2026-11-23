"""Customer subscriptions."""

import calendar
from dataclasses import dataclass
from datetime import date


def add_years(day: date, years: int) -> date:
    """The same day `years` later; 29 February becomes 28 February when that year has no leap day."""
    year = day.year + years
    last_day = calendar.monthrange(year, day.month)[1]
    return day.replace(year=year, day=min(day.day, last_day))


@dataclass
class Subscription:
    """One customer's plan. `started_on` is the first day of the current term."""

    id: str
    customer_email: str
    plan: str
    started_on: date
    auto_renew: bool = True

    def next_renewal_date(self) -> date:
        """The day this subscription renews, one year after the current term started."""
        return add_years(self.started_on, 1)
