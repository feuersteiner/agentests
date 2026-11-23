"""The client for Paywell, our payment provider."""

from store import config, http


class PaymentProviderError(Exception):
    """Paywell turned the request down."""


def _call(path: str, payload: dict) -> dict:
    answer = http.post_json(f"{config.PAYWELL_URL}{path}", payload)
    if answer.get("status") != "ok":
        raise PaymentProviderError(answer.get("message", "Paywell refused the request"))
    return answer


def charge(order_id: int, amount_cents: int) -> str:
    """Charge the customer for an order and return Paywell's reference for the charge."""
    return _call("/charges", {"order": order_id, "amount": amount_cents})["reference"]


def refund(provider_reference: str, amount_cents: int) -> str:
    """Refund a charge, in full or in part, and return Paywell's reference for the refund."""
    return _call("/refunds", {"charge": provider_reference, "amount": amount_cents})["reference"]
