"""Customer subscriptions."""

from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class Subscription:
    """One customer's plan. `started_on` is the first day of the current term."""

    id: str
    customer_email: str
    plan: str
    started_on: date
    auto_renew: bool = True

    def next_renewal_date(self) -> Optional[date]:
        """The day this subscription renews, one year after the term started.

        Returns None when that day does not exist next year.
        """
        try:
            return self.started_on.replace(year=self.started_on.year + 1)
        except ValueError:
            return None
