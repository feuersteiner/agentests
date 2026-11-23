"""The plans Oakhurst Hosting sells."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Plan:
    code: str
    name: str
    price_pence: int
    sites: int


STARTER = Plan("starter", "Starter", 4800, 1)
BUSINESS = Plan("business", "Business", 14400, 10)

PLANS = {plan.code: plan for plan in (STARTER, BUSINESS)}


def format_price(pence: int) -> str:
    """Format an amount in pence as pounds, for example 4800 as "£48.00"."""
    pounds, rest = divmod(pence, 100)
    return f"£{pounds}.{rest:0<2}"
