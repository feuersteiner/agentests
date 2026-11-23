import pytest

from hooks.store import store


@pytest.fixture(autouse=True)
def empty_store():
    """Every test starts with empty tables."""
    store.customers.clear()
    store.charges.clear()
    store.invoices.clear()
    store.refunds.clear()
    store.subscriptions.clear()
    store.processed_events.clear()
