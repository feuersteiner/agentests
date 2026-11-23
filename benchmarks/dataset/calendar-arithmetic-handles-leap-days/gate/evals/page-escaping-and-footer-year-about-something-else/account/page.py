"""The account page a customer sees after signing in."""

import html
from dataclasses import dataclass
from datetime import date

from billing.plans import PLANS, format_price


@dataclass
class Account:
    name: str
    email: str
    plan: str
    signed_up_on: date


def format_date(day: date) -> str:
    """A date as the account page shows it, for example "14 March 2026"."""
    return f"{day.day} {day:%B %Y}"


def render_account_page(account: Account, today: date) -> str:
    """The HTML of the account page. The name and email are escaped: customers type them."""
    plan = PLANS[account.plan]
    rows = [
        ("Name", html.escape(account.name)),
        ("Email", html.escape(account.email)),
        ("Plan", f"{plan.name}, {format_price(plan.price_pence)} a year"),
        ("Member since", format_date(account.signed_up_on)),
    ]
    if account.signed_up_on.year < today.year:
        rows.append(("With us", f"since {account.signed_up_on.year}"))
    items = "\n".join(f"  <dt>{label}</dt>\n  <dd>{value}</dd>" for label, value in rows)
    footer = f"<footer>© {today.year} Oakhurst Hosting</footer>"
    return f"<h1>Your account</h1>\n<dl>\n{items}\n</dl>\n{footer}\n"
