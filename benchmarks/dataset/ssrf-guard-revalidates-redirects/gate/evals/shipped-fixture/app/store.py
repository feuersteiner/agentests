"""In-memory storage that stands in for Postgres in development and tests."""

from __future__ import annotations

import itertools
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class Member:
    id: str
    name: str
    bio: str = ""
    website: str | None = None
    website_title: str | None = None


@dataclass
class Post:
    id: int
    author: str
    text: str
    url: str | None
    created_at: datetime


@dataclass
class Image:
    id: int
    owner: str
    content_type: str
    data: bytes
    created_at: datetime


members: dict[str, Member] = {}
posts: dict[int, Post] = {}
images: dict[int, Image] = {}
_ids = itertools.count(1)


def next_id() -> int:
    return next(_ids)


def now() -> datetime:
    return datetime.now(timezone.utc)


def reset() -> None:
    """Empty every table and add the two members the development board starts with."""
    global _ids
    members.clear()
    posts.clear()
    images.clear()
    _ids = itertools.count(1)
    members["ana"] = Member(id="ana", name="Ana Ruiz")
    members["ben"] = Member(id="ben", name="Ben Okafor")


reset()
