"""Outgoing email.

Messages are appended to `outbox`, like Django's in-memory email backend. The deployed app
replaces `deliver` with the SMTP relay at start-up.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


@dataclass
class Message:
    to: str
    subject: str
    body: str


outbox: list[Message] = []


def _keep(message: Message) -> None:
    outbox.append(message)


deliver: Callable[[Message], None] = _keep


def send_mail(to: str, subject: str, body: str) -> Message:
    """Send one plain-text email and return it."""
    message = Message(to=to, subject=subject, body=body)
    deliver(message)
    return message
