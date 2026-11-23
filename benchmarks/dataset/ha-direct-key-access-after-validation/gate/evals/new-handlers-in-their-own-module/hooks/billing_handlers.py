"""Handlers for the invoice and subscription events."""

from hooks.store import store

CANCELLATION_LABELS = {
    "too_expensive": "Price",
    "switched_provider": "Moved to a competitor",
    "missing_feature": "Missing feature",
}


def handle_invoice_paid(event: dict) -> None:
    data = event["data"]
    store.invoices[data["invoice_id"]].update(
        status="paid", amount_paid=data["amount"], currency=data["currency"]
    )


def handle_subscription_cancelled(event: dict) -> None:
    data = event["data"]
    store.subscriptions[data["subscription_id"]].update(
        status="cancelled",
        cancellation_reason=data["reason"],
        cancellation_label=CANCELLATION_LABELS.get(data["reason"], "Other"),
        ends_on=data["effective_date"],
        feedback=data.get("feedback", ""),
    )
