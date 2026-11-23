"""Requests, responses and HTTP errors."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from core.models import User


@dataclass
class Request:
    method: str
    path: str
    user: User
    query: dict[str, str] = field(default_factory=dict)


@dataclass
class Response:
    status: int = 200
    data: Any = None


class HttpError(Exception):
    status = 500

    def __init__(self, detail: str = ""):
        super().__init__(detail)
        self.detail = detail


class BadRequest(HttpError):
    status = 400


class NotFound(HttpError):
    status = 404
