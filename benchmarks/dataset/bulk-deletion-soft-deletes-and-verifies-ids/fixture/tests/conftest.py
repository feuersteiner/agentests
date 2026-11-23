"""A fake Pebblework admin API, so the tooling runs without a network."""

import re
from urllib.parse import parse_qs, urlsplit

import pytest

from admin_api import http

PARENT_FIELDS = ("account_id", "site_id", "workspace_id")


class FakePlatform:
    """Answers the admin API's routes from memory and records what was deleted and emailed."""

    def __init__(self, resources: list[dict]):
        self.resources = {resource["id"]: dict(resource) for resource in resources}
        self.trash: dict[str, dict] = {}
        self.erased: list[str] = []
        self.emails: list[tuple[str, str]] = []
        self.requests: list[tuple[str, str]] = []

    def _with_contents(self, resource_id: str) -> list[str]:
        ids = [resource_id]
        for child in list(self.resources.values()):
            if any(child.get(field) == resource_id for field in PARENT_FIELDS):
                ids += self._with_contents(child["id"])
        return ids

    def request(self, method: str, path: str, body: dict | None = None) -> dict:
        self.requests.append((method, path))
        url = urlsplit(path)
        query = {name: values[0] for name, values in parse_qs(url.query).items()}
        if method == "GET" and url.path == "/resources":
            wanted = query.pop("type")
            found = [
                dict(resource)
                for resource in self.resources.values()
                if resource["type"] == wanted
                and all(str(resource.get(name)) == value for name, value in query.items())
            ]
            return {"resources": found}
        match = re.fullmatch(r"/resources/(r-[0-9a-f]+)(/\w+)?", url.path)
        if match is None:
            raise AssertionError(f"unexpected request: {method} {path}")
        resource_id, action = match[1], match[2]
        if action == "/restore" and method == "POST":
            for item in [item for item in self.trash.values() if item["_deleted_with"] == resource_id]:
                del item["_deleted_with"]
                self.resources[item["id"]] = self.trash.pop(item["id"])
            return {}
        if resource_id not in self.resources:
            raise http.NotFound(path)
        if method == "GET" and action is None:
            return dict(self.resources[resource_id])
        if method == "PATCH" and action is None:
            self.resources[resource_id].update(body or {})
            return dict(self.resources[resource_id])
        if method == "POST" and action == "/notify":
            self.emails.append((resource_id, body["template"]))
            return {}
        if method == "DELETE" and action is None:
            for item_id in self._with_contents(resource_id):
                item = self.resources.pop(item_id)
                if query.get("permanent") == "false":
                    self.trash[item_id] = {**item, "_deleted_with": resource_id}
                else:
                    self.erased.append(item_id)
            return {}
        raise AssertionError(f"unexpected request: {method} {path}")


RESOURCES = [
    {"id": "r-a1", "type": "account", "name": "Harbor & Finch", "plan": "team",
     "trial_ends_at": "2026-03-02", "owner_email": "ops@harborfinch.example"},
    {"id": "r-a2", "type": "account", "name": "Kilnworks", "plan": "trial",
     "trial_ends_at": "2026-11-25", "owner_email": "hello@kilnworks.example"},
    {"id": "r-a3", "type": "account", "name": "Pemberton Cycles", "plan": "trial",
     "trial_ends_at": "2026-09-01", "owner_email": "shop@pemberton.example"},
    {"id": "r-a4", "type": "account", "name": "Quayside Dental", "plan": "business",
     "trial_ends_at": "2025-12-15", "owner_email": "it@quayside.example"},
    {"id": "r-51", "type": "site", "name": "harborfinch", "account_id": "r-a1", "status": "active"},
    {"id": "r-52", "type": "site", "name": "kilnworks", "account_id": "r-a2", "status": "active"},
    {"id": "r-53", "type": "site", "name": "pemberton", "account_id": "r-a3", "status": "closed"},
    {"id": "r-54", "type": "site", "name": "quayside", "account_id": "r-a4", "status": "closed"},
    {"id": "r-b1", "type": "app", "site_id": "r-51", "app_key": "boards"},
    {"id": "r-b2", "type": "app", "site_id": "r-51", "app_key": "insight"},
    {"id": "r-b3", "type": "app", "site_id": "r-52", "app_key": "insight"},
    {"id": "r-b4", "type": "app", "site_id": "r-54", "app_key": "docs"},
    {"id": "r-c1", "type": "workspace", "name": "Operations", "site_id": "r-51"},
    {"id": "r-c2", "type": "workspace", "name": "Studio", "site_id": "r-52"},
    {"id": "r-d1", "type": "project", "name": "Spring fleet", "workspace_id": "r-c1"},
    {"id": "r-d2", "type": "project", "name": "Dock rota", "workspace_id": "r-c1"},
    {"id": "r-d3", "type": "project", "name": "Kiln schedule", "workspace_id": "r-c2"},
]


@pytest.fixture
def platform(monkeypatch):
    fake = FakePlatform(RESOURCES)
    monkeypatch.setattr(http, "request", fake.request)
    return fake
