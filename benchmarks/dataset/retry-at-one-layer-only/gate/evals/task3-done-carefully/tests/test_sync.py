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


def test_a_failed_sync_is_run_again_after_five_minutes(transport):
    from app.queue import run_job

    # Four 503s use up the session's retries, so the first run fails; the second succeeds.
    transport.plan(f"{INVENTORY}/stock/HAM-16", (503, {}), (503, {}), (503, {}), (503, {}), stock(12))
    plan_all(transport, {"DRL-18V": 0, "SCR-100": 340})
    waits = []
    assert run_job("stock-sync", sleep=waits.append) == 3
    assert waits == [300]
    assert STOCK_LEVELS["HAM-16"] == 12
