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

    def __post_init__(self) -> None:
        self.customer_email = self.customer_email.lower()

    def next_renewal_date(self) -> date:
        """The day this subscription renews: exactly one year after the term started."""
        return self.started_on.replace(year=self.started_on.year + 1)
