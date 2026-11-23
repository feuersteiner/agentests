"""The accounts app's models."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timezone

from core.db import Model

_ITERATIONS = 200_000


def fold_email(address: str) -> str:
    """The form of an address that lookups compare: Unicode-normalised and casefolded."""
    return unicodedata.normalize("NFKC", address.strip()).casefold()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash(raw: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", raw.encode(), salt.encode(), _ITERATIONS).hex()


@dataclass
class User(Model):
    username: str
    email: str
    email_folded: str = ""
    display_name: str = ""
    password_hash: str = ""
    is_active: bool = True
    date_joined: datetime = field(default_factory=_now)
    id: int = 0

    def __post_init__(self) -> None:
        self.email_folded = fold_email(self.email)

    @property
    def label(self) -> str:
        """The name shown on class rosters: the display name, or the username when there is none."""
        return self.display_name

    def set_password(self, raw: str) -> None:
        salt = secrets.token_hex(8)
        self.password_hash = f"{salt}${_hash(raw, salt)}"

    def check_password(self, raw: str) -> bool:
        if "$" not in self.password_hash:
            return False
        salt, digest = self.password_hash.split("$", 1)
        return hmac.compare_digest(digest, _hash(raw, salt))


@dataclass
class PasswordResetRequest(Model):
    """A request for the front desk to send someone a password reset link."""

    user_id: int
    created_at: datetime = field(default_factory=_now)
    handled: bool = False
    id: int = 0
