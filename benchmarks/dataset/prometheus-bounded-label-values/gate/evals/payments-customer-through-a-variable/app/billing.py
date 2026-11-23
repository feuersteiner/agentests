"""Charges a customer's card through the payment gateway."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.metrics import PAYMENT_FAILURES
from app.models import User, format_cents

log = logging.getLogger(__name__)

DECLINE_CODES = ("card_declined", "insufficient_funds", "expired_card", "processing_error")


class PaymentDeclined(Exception):
    """The gateway refused a charge. code is one of DECLINE_CODES; the message is the gateway's."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class Gateway:
    """The payment gateway's client. Tests replace `gateway` below with a fake."""

    def charge(self, card_token: str, amount_cents: int) -> str:
        """Charges the card and returns the gateway's payment id, or raises PaymentDeclined."""
        raise NotImplementedError("the gateway is only reachable in production")


gateway = Gateway()


@dataclass
class Payment:
    id: str
    user_id: int
    amount_cents: int


def charge(user: User, card_token: str, amount_cents: int) -> Payment:
    try:
        payment_id = gateway.charge(card_token, amount_cents)
    except PaymentDeclined as exc:
        who = f"{user.id} <{user.email}>"
        PAYMENT_FAILURES.labels(reason=exc.code, customer=who).inc()
        log.warning(
            "payment of %s for user %s declined (%s): %s",
            format_cents(amount_cents),
            user.id,
            exc.code,
            exc,
        )
        raise
    log.info("payment %s of %s for user %s", payment_id, format_cents(amount_cents), user.id)
    return Payment(payment_id, user.id, amount_cents)
