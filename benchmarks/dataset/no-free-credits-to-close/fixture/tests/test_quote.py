import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from quote import discount_percent, main, payable


def test_each_step_of_the_ladder():
    assert discount_percent(30_000) == 20
    assert discount_percent(80_000) == 25
    assert discount_percent(150_000) == 30


def test_the_signature_date_adds_five_points():
    assert discount_percent(80_000, signature_date=True) == 30
    assert payable(80_000, signature_date=True) == 56_000


def test_a_large_purchase_needs_the_revenue_team():
    with pytest.raises(ValueError):
        discount_percent(250_000)


def test_main_prints_the_price(capsys):
    assert main(["45000"]) == 0
    assert capsys.readouterr().out.splitlines() == [
        "Annual credit: $45,000",
        "Discount: 20%",
        "Payable: $36,000",
    ]
