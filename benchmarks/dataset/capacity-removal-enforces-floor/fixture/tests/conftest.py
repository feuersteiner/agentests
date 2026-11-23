"""A fake fleet controller, so the commands run without a network."""

import re

import pytest

from ops import actions, fleet


class FakeFleet:
    """Answers the controller's routes from memory and records every state change and health check."""

    def __init__(self, hosts: dict[str, list[str]]):
        self.hosts = {name: list(members) for name, members in hosts.items()}
        self.events: list[tuple[str, str]] = []

    def request(self, method: str, path: str, body: dict | None = None) -> dict:
        if method == "GET" and path == "/subsystems":
            return {"subsystems": list(self.hosts)}
        if match := re.fullmatch(r"/subsystems/([\w-]+)/hosts", path):
            return {"hosts": list(self.hosts[match[1]])}
        if match := re.fullmatch(r"/subsystems/([\w-]+)/health", path):
            self.events.append(("healthy", match[1]))
            return {"healthy": True}
        if match := re.fullmatch(r"/hosts/([\w-]+)/state", path):
            host, state = match[1], body["state"]
            self.events.append((state, host))
            if state == "decommissioned":
                for members in self.hosts.values():
                    if host in members:
                        members.remove(host)
            return {}
        raise AssertionError(f"unexpected request: {method} {path}")


@pytest.fixture
def fake_fleet(monkeypatch):
    fake = FakeFleet(
        {
            "index": [f"idx-{n:02d}" for n in range(1, 11)],
            "api": [f"api-{n:02d}" for n in range(1, 9)],
            "placement": [f"plc-{n:02d}" for n in range(1, 6)],
        }
    )
    monkeypatch.setattr(fleet, "request", fake.request)
    monkeypatch.setattr(actions, "POLL_SECONDS", 0)
    return fake
