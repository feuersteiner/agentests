"""Customer subscriptions."""

from dataclasses import dataclass
from datetime import date, timedelta

RENEWAL_PERIOD = timedelta(days=365)  # one year


@dataclass
class Subscription:
    """One customer's plan. `started_on` is the first day of the current term."""

    id: str
    customer_email: str
    plan: str
    started_on: date
    auto_renew: bool = True

    def next_renewal_date(self) -> date:
        """The day this annual subscription renews, one year after the term started."""
        return self.started_on + RENEWAL_PERIOD
