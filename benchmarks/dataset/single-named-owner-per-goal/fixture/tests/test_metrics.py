import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from metrics import activation, percent, read_weeks, totals

EXPORT = Path(__file__).resolve().parent.parent / "data" / "q2-weekly.csv"


def write_export(tmp_path, rows):
    path = tmp_path / "weekly.csv"
    lines = ["week,trials,connected_day_one,converted", *rows]
    path.write_text("\n".join(lines) + "\n")
    return path


def test_read_weeks_turns_counts_into_integers(tmp_path):
    path = write_export(tmp_path, ["2026-W14,10,4,1"])
    assert read_weeks(path) == [
        {"week": "2026-W14", "trials": 10, "connected_day_one": 4, "converted": 1}
    ]


def test_totals_sum_every_week(tmp_path):
    path = write_export(tmp_path, ["2026-W14,10,4,1", "2026-W15,20,6,3"])
    assert totals(read_weeks(path)) == {"trials": 30, "connected_day_one": 10, "converted": 4}


def test_percent_rounds_to_one_decimal_place():
    assert percent(1, 3) == 33.3


def test_q2_activation():
    assert activation(read_weeks(EXPORT)) == 41.0
