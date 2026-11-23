from minietl.runner import run

from helpers import orders, seed_orders


def assert_rows(db, expected):
    assert orders(db) == expected


def test_merge_updates_a_changed_row_in_place(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(1, "shipped", 20.0, "2026-10-02")])

    run(db, "orders", strategy="merge")

    assert_rows(db, [(1, "shipped", 20.0, "2026-10-02")])


def test_merge_inserts_rows_with_a_new_key(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(2, "pending", 12.0, "2026-10-02")])

    run(db, "orders", strategy="merge")

    assert_rows(db, [(1, "pending", 20.0, "2026-10-01"), (2, "pending", 12.0, "2026-10-02")])
