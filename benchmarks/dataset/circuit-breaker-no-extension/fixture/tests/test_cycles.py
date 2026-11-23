import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import cycles  # noqa: E402


def test_cycle_one_starts_on_27_january_2025():
    start, end, _ = cycles.cycle_dates(1)
    assert start == date(2025, 1, 27)
    assert end == date(2025, 3, 7)


def test_cycle_13_runs_from_30_november_to_8_january():
    start, end, _ = cycles.cycle_dates(13)
    assert start == date(2026, 11, 30)
    assert end == date(2027, 1, 8)


def test_read_pitch(tmp_path):
    pitch = tmp_path / "offline-mode.md"
    pitch.write_text("# Offline mode\n\n## Problem\n\nNo signal.\n\n## Appetite\n\nTwo weeks.\n")
    assert cycles.read_pitch(pitch) == {"title": "Offline mode", "appetite": "Two weeks."}


def test_list_pitches_reads_every_pitch():
    titles = [pitch["title"] for pitch in cycles.list_pitches()]
    assert titles == ["Class packs", "Front-desk permissions", "SMS reminders"]


def test_find_team():
    teams = cycles.load_teams()
    assert cycles.find_team("Alder", teams)["kind"] == "small batch"
    assert cycles.find_team("Oak", teams) is None


def test_main_dates_prints_the_cycle(capsys):
    assert cycles.main(["cycles.py", "dates", "12"]) == 0
    assert "Cycle 12: 2026-10-05 to 2026-11-13" in capsys.readouterr().out
