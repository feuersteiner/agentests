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


def handle_refund_created(event: dict) -> None:
    data = event["data"]
    charge = store.charges[data["charge_id"]]
    refundable = charge.get("amount", 0) - charge.get("refunded", 0)
    if data["amount"] > refundable:
        raise ValueError(f"refund {data['refund_id']} is larger than what is left of the charge")
    store.refunds[data["refund_id"]] = {
        "charge_id": data["charge_id"],
        "amount": data["amount"],
        "note": data.get("note", ""),
    }
    charge["refunded"] = charge.get("refunded", 0) + data["amount"]


HANDLERS = {
    "charge.succeeded": handle_charge_succeeded,
    "customer.created": handle_customer_created,
    "customer.updated": handle_customer_updated,
    "refund.created": handle_refund_created,
}
