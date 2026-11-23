"""The plans Tallybird sells."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Plan:
    name: str
    price_cents: int
    project_limit: int


FREE = Plan("free", 0, 3)
TEAM = Plan("team", 2900, 20)
BUSINESS = Plan("business", 9900, 50)

PLANS = {plan.name: plan for plan in (FREE, TEAM, BUSINESS)}

TRIAL_DAYS = 14
INVOICE_DUE_DAYS = 14
