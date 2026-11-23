import pytest

from minietl import runner
from minietl.runner import run

from helpers import orders, seed_orders


def test_first_run_loads_every_source_row(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01"), (2, "pending", 35.5, "2026-10-01")])

    loaded = run(db, "orders")

    assert loaded == 2
    assert orders(db) == [(1, "pending", 20.0, "2026-10-01"), (2, "pending", 35.5, "2026-10-01")]


def test_merge_updates_a_changed_row_in_place(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01"), (2, "pending", 35.5, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(1, "shipped", 20.0, "2026-10-02")])

    loaded = run(db, "orders", strategy="merge")

    assert loaded == 1
    assert orders(db) == [(1, "shipped", 20.0, "2026-10-02"), (2, "pending", 35.5, "2026-10-01")]
    # and it really went through the upsert, not a delete
    assert runner.last_sql.startswith("INSERT INTO orders")


def test_unknown_strategy_leaves_the_database_alone(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])

    with pytest.raises(ValueError):
        run(db, "orders", strategy="truncate")

    tables = db.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
    assert tables == [("raw_orders",)]
