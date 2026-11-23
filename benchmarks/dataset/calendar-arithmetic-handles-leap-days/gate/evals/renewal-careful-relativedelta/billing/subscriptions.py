"""Customer subscriptions."""

from dataclasses import dataclass
from datetime import date

from dateutil.relativedelta import relativedelta


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
        """The day this subscription renews: one year after the term started.

        relativedelta keeps the day of the month and clamps it to the end of the month, so a
        term that starts on 29 February renews on 28 February.
        """
        return self.started_on + relativedelta(years=1)
