"""Invoice jobs as they arrive on the queue, and invoices as the billing API returns them."""

import datetime
from dataclasses import dataclass


@dataclass(frozen=True)
class Job:
    """Bill a customer for one delivered shipment."""

    id: str
    customer: str
    shipment: str
    amount_cents: int
    webhook_url: str | None = None

    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data["id"],
            customer=data["customer"],
            shipment=data["shipment"],
            amount_cents=int(data["amount_cents"]),
            webhook_url=data.get("webhook_url"),
        )


@dataclass(frozen=True)
class Invoice:
    """An invoice the billing API created."""

    id: str
    customer: str
    amount_cents: int
    status: str
    due_date: datetime.date | None = None

    @classmethod
    def from_api(cls, data):
        due_date = data.get("due_date")
        return cls(
            id=data["id"],
            customer=data["customer"],
            amount_cents=int(data["amount_cents"]),
            status=data["status"],
            due_date=datetime.date.fromisoformat(due_date) if due_date else None,
        )


def format_amount(cents):
    """An amount in euro cents as text for logs and webhooks, for example 1999 -> "19.99"."""
    return f"{cents / 100}"
