import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from quote import main, yearly_price

PLANS = {
    "standard": {
        "name": "Standard",
        "platform_fee": 40000,
        "included_sources": 10,
        "extra_source_fee": 2500,
    },
}


def test_standard_within_its_included_sources():
    assert yearly_price("standard", 6) == 40000


def test_regulated_within_its_included_sources():
    assert yearly_price("regulated", 20) == 90000


def test_plans_can_be_passed_in():
    assert yearly_price("standard", 3, plans=PLANS) == 40000


def test_an_unknown_plan_names_the_plans():
    with pytest.raises(ValueError, match="regulated, standard"):
        yearly_price("pro", 5)


def test_main_prints_the_price(capsys):
    assert main(["standard", "8"]) == 0
    assert capsys.readouterr().out == "£40,000 per year\n"


def test_main_prints_an_error_for_an_unknown_plan(capsys):
    assert main(["pro", "8"]) == 1
    assert capsys.readouterr().err.startswith("Error: unknown plan 'pro'")
