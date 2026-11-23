"""Training statistics computed from workout logs."""

from __future__ import annotations

from datetime import date
from typing import Iterable

from manager.models import WorkoutLog


def estimated_one_rep_max(weight: float, reps: int) -> float:
    """The Epley estimate of the heaviest single the lifter could do, rounded to 0.5 kg."""
    if reps < 1:
        raise ValueError("reps must be at least 1")
    return round(weight * (1 + reps / 30) * 2) / 2


def weekly_volume(logs: Iterable[WorkoutLog]) -> dict[int, float]:
    """The total weight lifted, reps times weight, in each ISO week of the logs' dates."""
    volume: dict[int, float] = {}
    for log in logs:
        week = date.fromisoformat(log.date).isocalendar().week
        volume[week] = volume.get(week, 0.0) + log.reps * log.weight
    return volume
