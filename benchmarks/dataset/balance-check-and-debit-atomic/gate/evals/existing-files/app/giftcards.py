"""Gift cards: codes sold in the shop that carry a value in pence."""

import secrets

from app import clock, db


def _new_code() -> str:
    return "KP-" + "-".join(secrets.token_hex(2).upper() for _ in range(3))


def issue_gift_card(value_cents: int) -> str:
    """Create a gift card worth `value_cents` and return its code."""
    if value_cents <= 0:
        raise ValueError("value_cents must be positive")
    code = _new_code()
    db.connection().execute(
        "INSERT INTO gift_cards (code, value_cents, created_at) VALUES (?, ?, ?)",
        (code, value_cents, clock.timestamp()),
    )
    return code
