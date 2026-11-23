"""The entry point: validate an incoming payload and hand it to its handler."""

from hooks.handlers import HANDLERS
from hooks.schemas import validate_event
from hooks.store import store


def dispatch(payload: object) -> str:
    """Apply one webhook payload and return "handled", "ignored" or "duplicate".

    Raises InvalidEvent for a payload that validate_event rejects.
    """
    event = validate_event(payload)
    if event["id"] in store.processed_events:
        return "duplicate"
    handler = HANDLERS.get(event["type"])
    if handler is not None:
        handler(event)
    store.processed_events.add(event["id"])
    return "ignored" if handler is None else "handled"
