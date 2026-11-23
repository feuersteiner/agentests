import pytest

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


def test_merge_updates_a_changed_row_in_place(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01"), (2, "pending", 35.5, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(1, "shipped", 20.0, "2026-10-02")])

    loaded = run(db, "orders", strategy="merge")

    assert loaded == 1
    assert orders(db) == [(1, "shipped", 20.0, "2026-10-02"), (2, "pending", 35.5, "2026-10-01")]


def test_merge_inserts_rows_with_a_new_key(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(2, "pending", 12.0, "2026-10-02")])

    run(db, "orders", strategy="merge")

    assert orders(db) == [(1, "pending", 20.0, "2026-10-01"), (2, "pending", 12.0, "2026-10-02")]


def test_merge_keeps_one_row_per_key_over_several_runs(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(1, "paid", 20.0, "2026-10-02")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(1, "shipped", 20.0, "2026-10-03")])

    run(db, "orders", strategy="merge")

    count = db.execute("SELECT COUNT(*) FROM orders WHERE id = 1").fetchone()[0]
    assert count == 1
    assert orders(db) == [(1, "shipped", 20.0, "2026-10-03")]
