from datetime import date

import pytest

from csvtool.dates import parse_date


def test_parses_iso_date():
    assert parse_date("2026-03-09") == date(2026, 3, 9)


def test_ignores_surrounding_spaces():
    assert parse_date(" 2026-03-09 ") == date(2026, 3, 9)


@pytest.mark.parametrize("text", ["09/03/2026", "March 9", "2026-13-01", ""])
def test_rejects_other_text(text):
    with pytest.raises(ValueError):
        parse_date(text)
