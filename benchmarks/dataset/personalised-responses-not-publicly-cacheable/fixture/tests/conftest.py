from __future__ import annotations

import pytest

from app import create_app, db
from app.cache import cache
from app.web import Request, Response

MIRA = {"session": "tok-mira-7f3a"}
JONAS = {"session": "tok-jonas-21c9"}


@pytest.fixture(autouse=True)
def fresh_state():
    cache.clear()
    db.queries = 0
    yield
    cache.clear()


class Client:
    def __init__(self) -> None:
        self.app = create_app()

    def get(
        self, path: str, headers: dict[str, str] | None = None, cookies: dict[str, str] | None = None
    ) -> Response:
        return self.app.handle(Request("GET", path, headers=headers or {}, cookies=cookies or {}))


@pytest.fixture
def client() -> Client:
    return Client()
