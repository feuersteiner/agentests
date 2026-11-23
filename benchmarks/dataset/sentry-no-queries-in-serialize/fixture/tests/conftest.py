from __future__ import annotations

import pytest

from api.http import Request, Response
from api.urls import handle
from core import db
from core.models import Team, User


@pytest.fixture(autouse=True)
def clean_tables():
    db.reset()
    yield
    db.reset()


@pytest.fixture
def user() -> User:
    return User.objects.create(email="dev@example.com", name="Dev")


@pytest.fixture
def team() -> Team:
    return Team.objects.create(slug="platform", name="Platform")


class Client:
    """Sends requests to the API as one user."""

    def __init__(self, user: User):
        self.user = user

    def get(self, path: str, query: dict[str, str] | None = None) -> Response:
        return handle(Request(method="GET", path=path, user=self.user, query=query or {}))


@pytest.fixture
def client(user: User) -> Client:
    return Client(user)
