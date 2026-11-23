import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from quote import load_plans, yearly_cost

PLANS = load_plans()


def test_free_costs_nothing():
    assert yearly_cost(PLANS, "free", 3) == 0


def test_team_billed_yearly():
    assert yearly_cost(PLANS, "team", 10) == 1680


def test_free_stops_at_its_user_limit():
    with pytest.raises(ValueError):
        yearly_cost(PLANS, "free", 4)


def test_enterprise_is_not_quoted():
    with pytest.raises(ValueError):
        yearly_cost(PLANS, "enterprise", 200)


def test_unknown_billing_period():
    with pytest.raises(ValueError):
        yearly_cost(PLANS, "team", 10, "weekly")
