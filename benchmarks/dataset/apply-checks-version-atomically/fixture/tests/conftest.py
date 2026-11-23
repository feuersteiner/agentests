import json

import pytest

from enactor import dns, store

ENDPOINTS = ["api.fernhill.example", "edge.fernhill.example", "status.fernhill.example"]


class FakeDns:
    """Stands in for the DNS provider: keeps what was pushed, and fails when told to."""

    def __init__(self):
        self.records: dict[str, list[str]] = {}
        self.calls: list[tuple[str, list[str]]] = []
        self.failures: dict[str, int] = {}

    def fail_next(self, endpoint: str, times: int = 1) -> None:
        """Make the next `times` pushes for `endpoint` fail with a ConnectionError."""
        name = dns.fqdn(endpoint)
        self.failures[name] = self.failures.get(name, 0) + times

    def put_records(self, name: str, addresses: list[str]) -> None:
        self.calls.append((name, list(addresses)))
        if self.failures.get(name):
            self.failures[name] -= 1
            raise ConnectionError(f"provider unavailable for {name}")
        self.records[name] = list(addresses)


@pytest.fixture(autouse=True)
def database():
    """A fresh in-memory database with the three endpoints, none of them on a plan yet."""
    conn = store.connect(":memory:")
    conn.executemany("INSERT INTO endpoints (name) VALUES (?)", [(name,) for name in ENDPOINTS])
    yield conn


@pytest.fixture(autouse=True)
def fake_dns(monkeypatch):
    """A fake DNS provider for every test, and no real sleeping between push attempts."""
    fake = FakeDns()
    dns.configure(fake)
    monkeypatch.setattr(dns.time, "sleep", lambda seconds: None)
    yield fake
    dns.configure(None)


@pytest.fixture
def add_plan():
    """Write a plan the way the planner does. By default every endpoint gets 203.0.113.<gen>."""

    def add(gen: int, records: dict[str, list[str]] | None = None) -> None:
        records = records or {name: [f"203.0.113.{gen}"] for name in ENDPOINTS}
        store.connection().execute(
            "INSERT INTO plans (gen, created_at, records) VALUES (?, ?, ?)",
            (gen, f"2026-11-02T09:{gen % 60:02d}:00Z", json.dumps(records)),
        )

    return add
