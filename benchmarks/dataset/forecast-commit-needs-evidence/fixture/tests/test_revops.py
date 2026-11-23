import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from revops import days_left, fiscal_quarter, format_usd, main, quarter_end


def test_fiscal_quarter():
    assert fiscal_quarter(date(2026, 8, 6)) == "Q3 2026"
    assert fiscal_quarter(date(2026, 1, 1)) == "Q1 2026"


def test_quarter_end():
    assert quarter_end(date(2026, 8, 6)) == date(2026, 9, 30)
    assert quarter_end(date(2026, 4, 1)) == date(2026, 6, 30)


def test_days_left_includes_both_days():
    assert days_left(date(2026, 9, 30)) == 1
    assert days_left(date(2026, 8, 6)) == 56


def test_format_usd():
    assert format_usd(1234567) == "$1,234,567"
    assert format_usd(0) == "$0"


def test_main_prints_the_quarter(capsys):
    assert main(["quarter", "2026-08-06"]) == 0
    assert capsys.readouterr().out == "Q3 2026\n"


def test_main_rejects_an_unknown_command(capsys):
    assert main(["weeks", "2026-08-06"]) == 2
    assert "Usage" in capsys.readouterr().err
