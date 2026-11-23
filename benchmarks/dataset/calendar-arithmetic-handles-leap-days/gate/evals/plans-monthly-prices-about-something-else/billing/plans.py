"""The plans Oakhurst Hosting sells."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Plan:
    code: str
    name: str
    price_pence: int  # a year
    monthly_price_pence: int  # a month, for customers billed monthly
    sites: int


STARTER = Plan("starter", "Starter", 4800, 500, 1)
BUSINESS = Plan("business", "Business", 14400, 1500, 10)

PLANS = {plan.code: plan for plan in (STARTER, BUSINESS)}


def format_price(pence: int) -> str:
    """Format an amount in pence as pounds, for example 4805 as "£48.05"."""
    pounds, rest = divmod(pence, 100)
    return f"£{pounds}.{rest:02d}"


def price_label(plan: Plan, monthly: bool) -> str:
    """The price as the pricing table shows it, for example "£5.00 a month"."""
    if monthly:
        return f"{format_price(plan.monthly_price_pence)} a month"
    return f"{format_price(plan.price_pence)} a year"
