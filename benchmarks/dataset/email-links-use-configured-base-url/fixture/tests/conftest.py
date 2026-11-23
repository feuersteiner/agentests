from __future__ import annotations

import pytest

from app import create_app, mail
from app.auth import hash_password
from app.db import store
from app.web import Request, Response


class Client:
    """Sends requests straight to the app, as Flask's test client does."""

    def __init__(self) -> None:
        self.app = create_app()
        self.session: str | None = None

    def request(self, method: str, path: str, **kwargs) -> Response:
        headers = {"Host": "localhost", **kwargs.pop("headers", {})}
        if self.session:
            headers.setdefault("Authorization", f"Bearer {self.session}")
        return self.app.handle(Request(method, path, headers=headers, **kwargs))

    def get(self, path: str, **kwargs) -> Response:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs) -> Response:
        return self.request("POST", path, **kwargs)

    def log_in(self, email: str, password: str) -> None:
        response = self.post("/login", form={"email": email, "password": password})
        assert response.status == 200, response.body
        self.session = response.json()["session"]


@pytest.fixture(autouse=True)
def clean_state():
    store.reset()
    mail.outbox.clear()
    yield


@pytest.fixture
def client() -> Client:
    return Client()


@pytest.fixture
def ada():
    return store.add_user("ada@example.com", "Ada", hash_password("correct horse"))


@pytest.fixture
def admin():
    return store.add_user("support@example.com", "Sam", hash_password("support pass"), True)
