import pytest

from app.clients import InventoryClient
from app.http import HTTPError
from tests.conftest import INVENTORY, stock


def test_get_stock_retries_until_the_service_answers(transport):
    transport.plan(f"{INVENTORY}/stock/HAM-16", (503, {}), (503, {}), stock(7))
    assert InventoryClient().get_stock("HAM-16") == 7
    assert len(transport.calls) == 3


def test_get_stock_gives_up_after_the_last_attempt(transport):
    transport.plan(f"{INVENTORY}/stock/HAM-16", (503, {}))
    with pytest.raises(HTTPError):
        InventoryClient().get_stock("HAM-16")
