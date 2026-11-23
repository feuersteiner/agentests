"""One handler per event type. A handler gets the validated event and writes to the store."""

from hooks.store import store


def handle_charge_succeeded(event: dict) -> None:
    data = event["data"]
    store.charges[data["charge_id"]] = {
        "customer_id": data["customer_id"],
        "amount": data["amount"],
        "currency": data["currency"],
        "description": data.get("description", ""),
        "refunded": 0,
        "received_at": event["created"],
    }


def handle_customer_created(event: dict) -> None:
    data = event["data"]
    store.customers[data["customer_id"]] = {
        "email": data["email"],
        "name": data.get("name", ""),
    }


def handle_customer_updated(event: dict) -> None:
    data = event["data"]
    customer = store.customers[data["customer_id"]]
    customer["email"] = data["email"]
    if "name" in data:
        customer["name"] = data["name"]


def handle_subscription_cancelled(event: dict) -> None:
    data = event["data"]
    subscription = store.subscriptions[data["subscription_id"]]
    subscription["status"] = "cancelled"
    subscription["cancellation_reason"] = data["reason"]
    subscription["cancellation_effective_date"] = data["effective_date"]
    subscription["cancellation_feedback"] = data.get("feedback")


HANDLERS = {
    "charge.succeeded": handle_charge_succeeded,
    "customer.created": handle_customer_created,
    "customer.updated": handle_customer_updated,
    "subscription.cancelled": handle_subscription_cancelled,
}
