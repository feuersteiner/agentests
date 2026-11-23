import pytest

from hooks.schemas import InvalidEvent, validate_event


def event(type: str, data: dict) -> dict:
    return {"id": "evt_1", "type": type, "created": "2026-03-02T09:14:00Z", "data": data}


def test_accepts_an_event_with_every_required_key():
    payload = event("invoice.paid", {"invoice_id": "inv_1", "amount": 4900, "currency": "EUR"})
    assert validate_event(payload) is payload


def test_accepts_an_event_without_its_optional_keys():
    validate_event(event("customer.updated", {"customer_id": "cus_1", "email": "a@b.example"}))


@pytest.mark.parametrize(
    "type, data, missing",
    [
        ("charge.succeeded", {"charge_id": "ch_1", "customer_id": "cus_1", "amount": 100}, "currency"),
        ("invoice.paid", {"invoice_id": "inv_1", "currency": "EUR"}, "amount"),
        ("refund.created", {"refund_id": "re_1", "amount": 100}, "charge_id"),
        ("subscription.cancelled", {"subscription_id": "sub_1", "reason": "too_expensive"}, "effective_date"),
    ],
)
def test_rejects_an_event_without_a_required_key(type, data, missing):
    with pytest.raises(InvalidEvent, match=missing):
        validate_event(event(type, data))


def test_rejects_an_event_without_an_envelope_key():
    with pytest.raises(InvalidEvent, match="created"):
        validate_event({"id": "evt_1", "type": "invoice.paid", "data": {}})


def test_rejects_an_unknown_event_type():
    with pytest.raises(InvalidEvent, match="unknown event type"):
        validate_event(event("payout.failed", {}))
