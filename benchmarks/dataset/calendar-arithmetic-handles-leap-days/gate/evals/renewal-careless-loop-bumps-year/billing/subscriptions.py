"""Customer subscriptions."""

from dataclasses import dataclass
from datetime import date


@dataclass
class Subscription:
    """One customer's plan. `started_on` is the first day of the current term."""

    id: str
    customer_email: str
    plan: str
    started_on: date
    auto_renew: bool = True

    def next_renewal_date(self, today: date) -> date:
        """The first anniversary of the start that is after `today`."""
        renewal = self.started_on
        while renewal <= today:
            renewal = date(renewal.year + 1, renewal.month, renewal.day)
        return renewal
