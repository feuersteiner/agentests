"""Requests, responses and the HTTP errors a handler can raise."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models import User


@dataclass
class Request:
    method: str
    path: str
    headers: dict[str, str] = field(default_factory=dict)
    body: dict | None = None
    user: User | None = None


@dataclass
class Response:
    status: int
    body: object = None
    content_type: str = "application/json"


class HTTPError(Exception):
    status = 500

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class BadRequest(HTTPError):
    status = 400


class Unauthorized(HTTPError):
    status = 401


class NotFound(HTTPError):
    status = 404
