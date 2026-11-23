"""Trellis's data model."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from core.db import ForeignKey, Model, ReverseSet


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(eq=False)
class User(Model):
    email: str
    name: str = ""
    id: int = 0


@dataclass(eq=False)
class Team(Model):
    slug: str
    name: str
    id: int = 0

    project_set = ReverseSet("Project", "team_id")


@dataclass(eq=False)
class Project(Model):
    team_id: int
    slug: str
    name: str
    platform: str = ""
    date_created: datetime = field(default_factory=_now)
    id: int = 0

    team = ForeignKey("Team")
    member_set = ReverseSet("Member", "project_id")
    environment_set = ReverseSet("Environment", "project_id")
    release_set = ReverseSet("Release", "project_id")
    issue_set = ReverseSet("Issue", "project_id")
    bookmark_set = ReverseSet("Bookmark", "project_id")


@dataclass(eq=False)
class Member(Model):
    project_id: int
    user_id: int
    role: str = "member"
    id: int = 0

    project = ForeignKey("Project")
    user = ForeignKey("User")


@dataclass(eq=False)
class Environment(Model):
    project_id: int
    name: str
    id: int = 0

    project = ForeignKey("Project")


@dataclass(eq=False)
class Release(Model):
    project_id: int
    version: str
    date_released: datetime = field(default_factory=_now)
    id: int = 0

    project = ForeignKey("Project")


@dataclass(eq=False)
class Issue(Model):
    project_id: int
    title: str
    status: str = "open"  # "open", "resolved" or "ignored"
    id: int = 0

    project = ForeignKey("Project")


@dataclass(eq=False)
class Bookmark(Model):
    project_id: int
    user_id: int
    date_added: datetime = field(default_factory=_now)
    id: int = 0

    project = ForeignKey("Project")
    user = ForeignKey("User")
