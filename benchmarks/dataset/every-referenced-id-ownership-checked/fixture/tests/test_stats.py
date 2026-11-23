from __future__ import annotations

import pytest

from manager.models import WorkoutLog
from manager.stats import estimated_one_rep_max, weekly_volume


def test_one_rep_max_from_five_reps():
    assert estimated_one_rep_max(100, 5) == 116.5


def test_one_rep_max_needs_a_rep():
    with pytest.raises(ValueError):
        estimated_one_rep_max(100, 0)


def test_weekly_volume():
    logs = [
        WorkoutLog(user_id=1, exercise_id=1, reps=5, weight=100.0, date="2026-03-02"),
        WorkoutLog(user_id=1, exercise_id=1, reps=5, weight=100.0, date="2026-03-04"),
        WorkoutLog(user_id=1, exercise_id=1, reps=3, weight=120.0, date="2026-03-09"),
    ]
    assert weekly_volume(logs) == {10: 1000.0, 11: 360.0}
