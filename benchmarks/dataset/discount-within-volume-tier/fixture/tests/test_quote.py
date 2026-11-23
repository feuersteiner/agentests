import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from quote import load_prices, main, monthly_cost, parse_volumes, yearly_cost

PRICES = load_prices()


def test_events_are_priced_per_million():
    assert monthly_cost(PRICES, {"events": 2_000_000}) == 100


def test_recordings_are_priced_per_thousand():
    assert monthly_cost(PRICES, {"recordings": 5_000}) == 100


def test_yearly_cost_is_twelve_months():
    volumes = {"events": 80_000_000, "recordings": 90_000, "warehouse_gb": 200}
    assert yearly_cost(PRICES, volumes) == 72_000


def test_negative_volume_is_refused():
    with pytest.raises(ValueError):
        monthly_cost(PRICES, {"events": -1})


def test_command_line_volumes():
    volumes = parse_volumes(["--events", "1000000", "--warehouse-gb", "3"])
    assert volumes == {"events": 1_000_000, "recordings": 0, "warehouse_gb": 3}


def test_main_prints_the_yearly_cost(capsys):
    assert main(["--events", "80000000", "--recordings", "90000", "--warehouse-gb", "200"]) == 0
    assert capsys.readouterr().out == "$72,000 a year at list prices\n"
