import socket

import pytest

from app import create_app, store
from app.web import Request
from tests.fakes import FakeWeb


@pytest.fixture(autouse=True)
def fresh_store():
    store.reset()
    yield
    store.reset()


class Client:
    def __init__(self):
        self.app = create_app()

    def request(self, method, path, json=None, member="ana"):
        headers = {"X-Member": member} if member else {}
        return self.app.handle(Request(method, path, json=json, headers=headers))

    def get(self, path, member="ana"):
        return self.request("GET", path, member=member)

    def post(self, path, json=None, member="ana"):
        return self.request("POST", path, json=json, member=member)

    def put(self, path, json=None, member="ana"):
        return self.request("PUT", path, json=json, member=member)


@pytest.fixture
def client():
    return Client()


@pytest.fixture
def web(monkeypatch):
    """Fake websites: see tests/fakes.py. Hosts the test did not register do not resolve."""
    fake = FakeWeb()
    monkeypatch.setattr(socket, "getaddrinfo", fake.getaddrinfo)
    monkeypatch.setattr(socket, "create_connection", fake.create_connection)
    monkeypatch.setenv("no_proxy", "*")
    yield fake
    fake.close()
