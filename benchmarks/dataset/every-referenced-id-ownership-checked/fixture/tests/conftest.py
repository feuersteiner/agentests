from __future__ import annotations

from typing import Any

import pytest

from core import db
from core.rest import Request, Response
from manager.api.urls import handle
from manager.models import Exercise, Routine, User, WorkoutSession


@pytest.fixture(autouse=True)
def clean_tables():
    db.reset()
    yield
    db.reset()


@pytest.fixture
def user() -> User:
    return User.objects.create(username="ada")


@pytest.fixture
def squat() -> Exercise:
    return Exercise.objects.create(name="Back squat", category="Legs")


@pytest.fixture
def routine(user: User) -> Routine:
    return Routine.objects.create(user_id=user.id, name="Strength A")


@pytest.fixture
def session(user: User, routine: Routine) -> WorkoutSession:
    return WorkoutSession.objects.create(user_id=user.id, routine_id=routine.id, date="2026-03-02")


class Client:
    """Sends requests to the API as one user."""

    def __init__(self, user: User):
        self.user = user

    def request(self, method: str, path: str, data: Any = None, query: dict[str, str] | None = None) -> Response:
        request = Request(method=method, path=path, user=self.user, data=data if data is not None else {}, query_params=query or {})
        return handle(request)

    def get(self, path: str, query: dict[str, str] | None = None) -> Response:
        return self.request("GET", path, query=query)

    def post(self, path: str, data: Any = None) -> Response:
        return self.request("POST", path, data)

    def patch(self, path: str, data: Any = None) -> Response:
        return self.request("PATCH", path, data)


@pytest.fixture
def client(user: User) -> Client:
    return Client(user)
