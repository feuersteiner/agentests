"""Beacon's data model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from core.db import Model


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class User(Model):
    email: str
    id: int = 0


@dataclass
class Organization(Model):
    slug: str
    name: str
    id: int = 0


@dataclass
class Membership(Model):
    organization_id: int
    user_id: int
    role: str = "member"
    id: int = 0


@dataclass
class Project(Model):
    organization_id: int
    slug: str
    name: str
    created_at: datetime = field(default_factory=_now)
    id: int = 0


@dataclass
class Dashboard(Model):
    organization_id: int
    project_id: int
    title: str
    widgets: list[dict] = field(default_factory=list)
    created_at: datetime = field(default_factory=_now)
    id: int = 0


@dataclass
class Alert(Model):
    organization_id: int
    project_id: int
    name: str
    threshold: int = 1
    is_muted: bool = False
    id: int = 0


@dataclass
class Event(Model):
    organization_id: int
    project_id: int
    message: str
    level: str = "error"
    timestamp: datetime = field(default_factory=_now)
    id: int = 0
