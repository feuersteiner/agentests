"""Responses and page templates."""

from __future__ import annotations

import html
from dataclasses import dataclass, field
from pathlib import Path
from string import Template

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"


@dataclass
class Response:
    status: int
    body: str = ""
    headers: dict[str, str] = field(default_factory=dict)
    session: dict[str, object] = field(default_factory=dict)


def redirect(location: str, **session: object) -> Response:
    return Response(302, headers={"Location": location}, session=dict(session))


class _Context(dict):
    def __missing__(self, key: str) -> str:
        return ""


def render(name: str, **context: object) -> str:
    """Fill `templates/<name>`. Values are HTML-escaped; a placeholder with no value renders empty."""
    text = (TEMPLATES / name).read_text(encoding="utf-8")
    values = _Context({key: html.escape(str(value)) for key, value in context.items()})
    return Template(text).substitute(values)
