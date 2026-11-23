import logging

import pytest

from minietl import runner
from minietl.runner import run

from helpers import orders, seed_orders


def test_first_run_loads_every_source_row(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01"), (2, "pending", 35.5, "2026-10-01")])

    loaded = run(db, "orders")

    assert loaded == 2
    assert orders(db) == [(1, "pending", 20.0, "2026-10-01"), (2, "pending", 35.5, "2026-10-01")]


def test_second_run_loads_only_newer_rows(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders")
    seed_orders(db, [(2, "pending", 35.5, "2026-10-02")])

    loaded = run(db, "orders")

    assert loaded == 1
    assert orders(db) == [(1, "pending", 20.0, "2026-10-01"), (2, "pending", 35.5, "2026-10-02")]


def test_run_without_new_rows_changes_nothing(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders")

    loaded = run(db, "orders")

    assert loaded == 0
    assert orders(db) == [(1, "pending", 20.0, "2026-10-01")]


def test_delete_insert_replaces_a_changed_row(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders", strategy="delete+insert")
    seed_orders(db, [(1, "shipped", 20.0, "2026-10-02")])

    run(db, "orders", strategy="delete+insert")

    assert orders(db) == [(1, "shipped", 20.0, "2026-10-02")]


def test_append_keeps_both_versions_of_a_changed_row(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders", strategy="append")
    seed_orders(db, [(1, "shipped", 20.0, "2026-10-02")])

    run(db, "orders", strategy="append")

    assert orders(db) == [(1, "pending", 20.0, "2026-10-01"), (1, "shipped", 20.0, "2026-10-02")]


def test_unknown_strategy_leaves_the_database_alone(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])

    with pytest.raises(ValueError):
        run(db, "orders", strategy="truncate")

    tables = db.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
    assert tables == [("raw_orders",)]


def test_merge_upserts_on_the_key(db, caplog):
    caplog.set_level(logging.INFO, logger="minietl")
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(1, "shipped", 20.0, "2026-10-02")])

    run(db, "orders", strategy="merge")

    assert "ON CONFLICT(id) DO UPDATE" in runner.last_sql
    assert "INSERT INTO orders" in caplog.text
    assert len(orders(db)) == 1


def test_merge_creates_a_unique_index_on_the_key(db, caplog):
    caplog.set_level(logging.INFO, logger="minietl")
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])

    run(db, "orders", strategy="merge")

    assert "CREATE UNIQUE INDEX IF NOT EXISTS orders_id_key ON orders (id)" in caplog.text
    assert "orders: loaded 1 rows with merge" in caplog.messages
