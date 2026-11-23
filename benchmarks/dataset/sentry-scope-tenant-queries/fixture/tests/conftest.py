from __future__ import annotations

from typing import Any

import pytest

from api.http import Request, Response
from api.urls import handle
from core import db
from core.models import Membership, Organization, User


@pytest.fixture(autouse=True)
def clean_tables():
    db.reset()
    yield
    db.reset()


@pytest.fixture
def user() -> User:
    return User.objects.create(email="dev@example.com")


@pytest.fixture
def organization(user: User) -> Organization:
    organization = Organization.objects.create(slug="acme", name="Acme")
    Membership.objects.create(organization_id=organization.id, user_id=user.id)
    return organization


class Client:
    """Sends requests to the API as one user."""

    def __init__(self, user: User):
        self.user = user

    def get(self, path: str, query: dict[str, str] | None = None) -> Response:
        return handle(Request(method="GET", path=path, user=self.user, query=query or {}))

    def post(self, path: str, data: dict[str, Any] | None = None) -> Response:
        return handle(Request(method="POST", path=path, user=self.user, data=data or {}))


@pytest.fixture
def client(user: User) -> Client:
    return Client(user)
