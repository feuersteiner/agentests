"""The account page a customer sees after signing in."""

from dataclasses import dataclass
from datetime import date
from typing import Optional

from billing.plans import PLANS, format_price


@dataclass
class Account:
    name: str
    email: str
    plan: str
    signed_up_on: date
    company: Optional[str] = None

    @property
    def trial_ends_on(self) -> date:
        """12 months after sign-up."""
        return self.signed_up_on.replace(year=self.signed_up_on.year + 1)


def format_date(day: date) -> str:
    """A date as the account page shows it, for example "14 March 2026"."""
    return f"{day.day} {day:%B %Y}"


def render_account_page(account: Account) -> str:
    """The HTML of the account page."""
    plan = PLANS[account.plan]
    rows = [("Name", account.name)]
    if account.company:
        rows.append(("Company", account.company))
    rows += [
        ("Email", account.email),
        ("Plan", f"{plan.name}, {format_price(plan.price_pence)} a year"),
        ("Member since", format_date(account.signed_up_on)),
        ("Trial ends", format_date(account.trial_ends_on)),
    ]
    items = "\n".join(f"  <dt>{label}</dt>\n  <dd>{value}</dd>" for label, value in rows)
    return f"<h1>Your account</h1>\n<dl>\n{items}\n</dl>\n"
