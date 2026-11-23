from hooks.handlers import (
    handle_charge_succeeded,
    handle_customer_created,
    handle_customer_updated,
)
from hooks.store import store


def event(type: str, data: dict) -> dict:
    return {"id": "evt_1", "type": type, "created": "2026-03-02T09:14:00Z", "data": data}


def test_charge_succeeded_records_the_charge():
    handle_charge_succeeded(
        event(
            "charge.succeeded",
            {"charge_id": "ch_1", "customer_id": "cus_1", "amount": 4900, "currency": "EUR"},
        )
    )
    assert store.charges["ch_1"] == {
        "customer_id": "cus_1",
        "amount": 4900,
        "currency": "EUR",
        "description": "",
        "refunded": 0,
        "received_at": "2026-03-02T09:14:00Z",
    }


def test_customer_created_creates_the_customer():
    handle_customer_created(
        event("customer.created", {"customer_id": "cus_1", "email": "ines@fernhill.example"})
    )
    assert store.customers["cus_1"] == {"email": "ines@fernhill.example", "name": ""}


def test_customer_updated_keeps_the_name_when_the_event_has_none():
    store.customers["cus_1"] = {"email": "ines@fernhill.example", "name": "Ines Okafor"}
    handle_customer_updated(
        event("customer.updated", {"customer_id": "cus_1", "email": "billing@fernhill.example"})
    )
    assert store.customers["cus_1"] == {
        "email": "billing@fernhill.example",
        "name": "Ines Okafor",
    }
