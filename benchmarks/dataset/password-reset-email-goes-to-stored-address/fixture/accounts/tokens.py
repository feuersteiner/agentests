"""Signed, expiring tokens for the links Perch puts in emails.

A token reads `<user id>.<timestamp>.<signature>`. The signature covers the token's purpose and
the user's password hash, so a token made for one purpose is refused for another, and every token
stops working once the password changes.
"""

from __future__ import annotations

import hashlib
import hmac
import time

import settings
from accounts.models import User


def _sign(user: User, purpose: str, timestamp: int) -> str:
    message = f"{purpose}:{user.id}:{user.password_hash}:{timestamp}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), message, hashlib.sha256).hexdigest()


def make_token(user: User, purpose: str) -> str:
    timestamp = int(time.time())
    return f"{user.id}.{timestamp}.{_sign(user, purpose, timestamp)}"


def check_token(token: str, purpose: str) -> User | None:
    """The active user the token was made for, or None if it is malformed, forged or expired."""
    try:
        user_id, timestamp, signature = token.split(".")
        user = User.objects.get(id=int(user_id), is_active=True)
        issued = int(timestamp)
    except (ValueError, User.DoesNotExist):
        return None
    if time.time() - issued > settings.TOKEN_MAX_AGE_SECONDS:
        return None
    if not hmac.compare_digest(signature, _sign(user, purpose, issued)):
        return None
    return user
