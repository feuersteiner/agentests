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

    def next_renewal_date(self) -> date:
        """The day this subscription renews, one year after the term started.

        A term that starts on 29 February renews on 1 March when the next year has no
        29 February, so the customer never gets less than a full year.
        """
        year = self.started_on.year + 1
        try:
            return self.started_on.replace(year=year)
        except ValueError:
            return date(year, 3, 1)
