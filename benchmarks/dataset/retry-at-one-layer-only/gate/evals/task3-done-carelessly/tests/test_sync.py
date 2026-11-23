from app.jobs.sync import sync_stock
from app.models import STOCK_LEVELS
from app.queue import JOBS
from tests.conftest import INVENTORY, stock


def plan_all(transport, units):
    for sku, n in units.items():
        transport.plan(f"{INVENTORY}/stock/{sku}", stock(n))


def test_sync_fills_the_cache(transport):
    plan_all(transport, {"HAM-16": 12, "DRL-18V": 0, "SCR-100": 340})
    assert sync_stock() == 3
    assert STOCK_LEVELS == {"HAM-16": 12, "DRL-18V": 0, "SCR-100": 340}


def test_sync_is_registered_as_a_job():
    assert JOBS["stock-sync"] is sync_stock


def test_sync_retries_when_the_inventory_service_hiccups(transport):
    from app.http import TransportError

    transport.plan(f"{INVENTORY}/stock/HAM-16", TransportError("reset"), TransportError("reset"),
                   TransportError("reset"), TransportError("reset"), stock(12))
    plan_all(transport, {"DRL-18V": 0, "SCR-100": 340})
    assert sync_stock(sleep=lambda seconds: None) == 3
    assert STOCK_LEVELS["HAM-16"] == 12
