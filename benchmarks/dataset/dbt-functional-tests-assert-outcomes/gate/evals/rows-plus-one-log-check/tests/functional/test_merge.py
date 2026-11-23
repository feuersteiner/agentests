import logging

from minietl.runner import run

from helpers import orders, seed_orders


def test_merge_inserts_rows_with_a_new_key(db, caplog):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(2, "pending", 12.0, "2026-10-02")])

    with caplog.at_level(logging.INFO, logger="minietl"):
        run(db, "orders", strategy="merge")

    assert orders(db) == [(1, "pending", 20.0, "2026-10-01"), (2, "pending", 12.0, "2026-10-02")]
    assert "orders: loaded 1 rows with merge" in caplog.text


def test_merge_keeps_rows_that_did_not_change(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01"), (2, "paid", 8.0, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(2, "shipped", 8.0, "2026-10-02")])

    run(db, "orders", strategy="merge")

    assert orders(db) == [(1, "pending", 20.0, "2026-10-01"), (2, "shipped", 8.0, "2026-10-02")]
