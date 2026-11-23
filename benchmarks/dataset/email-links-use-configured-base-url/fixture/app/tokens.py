"""Signed, expiring tokens, for links that act on someone's behalf."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from app import config


class InvalidToken(Exception):
    pass


def make_token(purpose: str, subject_id: int) -> str:
    """A token that names `subject_id` (a user, an invitation...) for one `purpose`."""
    payload = json.dumps({"p": purpose, "s": subject_id, "t": int(time.time())})
    body = _encode(payload.encode())
    return f"{body}.{_sign(body)}"


def read_token(token: str, purpose: str, max_age: int) -> int:
    """The subject id of a token made for `purpose` at most `max_age` seconds ago."""
    body, _, signature = token.partition(".")
    if not signature or not hmac.compare_digest(signature, _sign(body)):
        raise InvalidToken("bad signature")
    payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
    if payload["p"] != purpose:
        raise InvalidToken("wrong purpose")
    if time.time() - payload["t"] > max_age:
        raise InvalidToken("expired")
    return payload["s"]


def _encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _sign(body: str) -> str:
    digest = hmac.new(config.SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
    return _encode(digest)
