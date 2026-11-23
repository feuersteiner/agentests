from app.jobs.sync import sync_stock
from app.models import STOCK_CACHE
from app.queue import JOBS
from tests.conftest import INVENTORY, stock


def plan_all(transport, units):
    for sku, n in units.items():
        transport.plan(f"{INVENTORY}/stock/{sku}", stock(n))


def test_sync_fills_the_cache(transport):
    plan_all(transport, {"HAM-16": 12, "DRL-18V": 0, "SCR-100": 340})
    assert sync_stock() == 3
    assert STOCK_CACHE == {"HAM-16": 12, "DRL-18V": 0, "SCR-100": 340}


def test_sync_is_registered_as_a_job():
    assert JOBS["stock-sync"] is sync_stock
