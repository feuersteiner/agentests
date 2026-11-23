"""Gift cards: codes sold in the shop that carry a value in pence."""

import secrets

from app import clock, db, models
from app.errors import BillingError, NotFound


class GiftCardAlreadyUsed(BillingError):
    """The gift card has already been redeemed."""


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


def redeem_gift_card(code: str, user_id: int) -> int:
    """Add the gift card's value to the user's credit, mark the card used, and return the new balance."""
    card = models.get_gift_card(code)
    if card is None:
        raise NotFound(f"gift card {code}")
    if models.get_user(user_id) is None:
        raise NotFound(f"user {user_id}")
    now = clock.timestamp()
    with db.transaction() as conn:
        claimed = conn.execute(
            "UPDATE gift_cards SET used_by = ?, used_at = ? WHERE code = ? AND used_at IS NULL",
            (user_id, now, code),
        ).rowcount
        if claimed == 0:
            raise GiftCardAlreadyUsed(code)
        conn.execute(
            "UPDATE users SET credit_cents = credit_cents + ? WHERE id = ?",
            (card.value_cents, user_id),
        )
        conn.execute(
            "INSERT INTO credit_entries (user_id, amount_cents, reason, created_at)"
            " VALUES (?, ?, ?, ?)",
            (user_id, card.value_cents, f"Gift card {code}", now),
        )
    return models.get_user(user_id).credit_cents
