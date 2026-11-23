import pytest

from hooks.app import dispatch
from hooks.schemas import InvalidEvent
from hooks.store import store

CUSTOMER_CREATED = {
    "id": "evt_1",
    "type": "customer.created",
    "created": "2026-03-02T09:14:00Z",
    "data": {"customer_id": "cus_1", "email": "ines@fernhill.example"},
}


def test_dispatch_runs_the_handler_of_the_event_type():
    assert dispatch(CUSTOMER_CREATED) == "handled"
    assert "cus_1" in store.customers


def test_dispatch_handles_an_event_id_only_once():
    dispatch(CUSTOMER_CREATED)
    store.customers.clear()
    assert dispatch(CUSTOMER_CREATED) == "duplicate"
    assert store.customers == {}


def test_dispatch_rejects_an_invalid_payload():
    with pytest.raises(InvalidEvent):
        dispatch({"id": "evt_2", "type": "customer.created", "created": "2026-03-02T09:14:00Z"})
