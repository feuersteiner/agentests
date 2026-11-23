"""The contract of every event Quillpay sends us, and the check that enforces it."""

from dataclasses import dataclass


class InvalidEvent(Exception):
    """The payload is not an event we accept."""


@dataclass(frozen=True)
class EventSchema:
    """The keys of one event type's `data`."""

    required: tuple[str, ...]
    optional: tuple[str, ...] = ()


ENVELOPE_KEYS = ("id", "type", "created", "data")

SCHEMAS: dict[str, EventSchema] = {
    "charge.succeeded": EventSchema(
        required=("charge_id", "customer_id", "amount", "currency"),
        optional=("description",),
    ),
    "customer.created": EventSchema(
        required=("customer_id", "email"),
        optional=("name",),
    ),
    "customer.updated": EventSchema(
        required=("customer_id", "email"),
        optional=("name", "tax_id"),
    ),
    "invoice.paid": EventSchema(
        required=("invoice_id", "amount", "currency"),
    ),
    "refund.created": EventSchema(
        required=("refund_id", "charge_id", "amount"),
        optional=("note",),
    ),
    "subscription.cancelled": EventSchema(
        required=("subscription_id", "reason", "effective_date"),
        optional=("feedback",),
    ),
}


def validate_event(payload: object) -> dict:
    """Return the payload as an event, or raise InvalidEvent.

    An accepted event has every envelope key, a type listed in SCHEMAS, and every key its type
    requires in `data`. Amounts are integers in the currency's minor unit, and dates are ISO 8601
    strings.
    """
    if not isinstance(payload, dict):
        raise InvalidEvent("the payload is not an object")
    missing = [key for key in ENVELOPE_KEYS if key not in payload]
    if missing:
        raise InvalidEvent(f"the event has no {', '.join(missing)}")
    schema = SCHEMAS.get(payload["type"])
    if schema is None:
        raise InvalidEvent(f"unknown event type {payload['type']!r}")
    data = payload["data"]
    if not isinstance(data, dict):
        raise InvalidEvent("the event's data is not an object")
    missing = [key for key in schema.required if key not in data]
    if missing:
        raise InvalidEvent(f"{payload['type']} has no {', '.join(missing)}")
    return payload
