"""Liftbook's training models."""

from __future__ import annotations

from dataclasses import dataclass

from core.db import Model


@dataclass
class User(Model):
    username: str
    id: int = 0


@dataclass
class Exercise(Model):
    """An entry of the exercise catalogue, shared by every user."""

    name: str
    category: str
    id: int = 0


@dataclass
class Routine(Model):
    """A training plan. A routine with `is_template` set is a template; `is_public` shares it."""

    user_id: int
    name: str
    description: str = ""
    is_template: bool = False
    is_public: bool = False
    id: int = 0


@dataclass
class SlotEntry(Model):
    """One exercise of a routine, with its planned sets, reps and weight in kg."""

    user_id: int
    routine_id: int
    exercise_id: int
    sets: int
    reps: int
    weight: float = 0.0
    order: int = 1
    id: int = 0

    relations = {"routine": Routine, "exercise": Exercise}


@dataclass
class WorkoutSession(Model):
    """One visit to the gym, on an ISO date."""

    user_id: int
    date: str
    routine_id: int | None = None
    notes: str = ""
    id: int = 0

    relations = {"routine": Routine}


@dataclass
class WorkoutLog(Model):
    """One set the user did: an exercise, the reps and the weight in kg."""

    user_id: int
    exercise_id: int
    reps: int
    weight: float
    date: str
    routine_id: int | None = None
    session_id: int | None = None
    slot_entry_id: int | None = None
    id: int = 0

    relations = {"routine": Routine, "session": WorkoutSession, "slot_entry": SlotEntry, "exercise": Exercise}
