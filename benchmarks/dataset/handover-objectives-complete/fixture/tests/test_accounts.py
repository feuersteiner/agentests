import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import accounts  # noqa: E402


def test_loads_every_account():
    assert set(accounts.load_accounts()) == {
        "alder-mutual",
        "bramble-health",
        "kestrel-insurance",
        "ferrow-logistics",
    }


def test_annual_value_of_recurring_lines():
    assert accounts.annual_value(accounts.load_accounts()["alder-mutual"]) == 96000


def test_add_months_keeps_the_day():
    assert accounts.add_months(date(2026, 12, 1), 12) == date(2027, 12, 1)


def test_add_months_stops_at_the_end_of_a_shorter_month():
    assert accounts.add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert accounts.add_months(date(2027, 11, 30), 3) == date(2028, 2, 29)


def test_days_until_a_later_date():
    assert accounts.days_until(date(2027, 3, 1), date(2026, 11, 16)) == "in 105 days"
    assert accounts.days_until(date(2026, 11, 17), date(2026, 11, 16)) == "in 1 day"


def test_days_until_the_same_date():
    assert accounts.days_until(date(2026, 11, 16), date(2026, 11, 16)) == "today"


def test_format_usd():
    assert accounts.format_usd(166800) == "$166,800"


def test_arr_command(capsys):
    assert accounts.main(["arr", "alder-mutual"]) == 0
    assert capsys.readouterr().out == "$96,000\n"


def test_usage_without_a_command(capsys):
    assert accounts.main([]) == 2
    assert "Usage:" in capsys.readouterr().err
