import pytest

from app.clients import InventoryClient, PricingClient, UnknownSku
from tests.conftest import INVENTORY, PRICING, price, stock


def test_get_stock_sums_the_warehouses(transport):
    transport.plan(f"{INVENTORY}/stock/DRL-18V", stock(3, 0, 5))
    assert InventoryClient().get_stock("DRL-18V") == 8


def test_get_stock_of_an_unknown_product(transport):
    transport.plan(f"{INVENTORY}/stock/NOPE-1", (404, {"error": "unknown sku"}))
    with pytest.raises(UnknownSku):
        InventoryClient().get_stock("NOPE-1")


def test_get_price_in_pence(transport):
    transport.plan(f"{PRICING}/prices/SCR-100", price(649))
    assert PricingClient().get_price("SCR-100") == 649
