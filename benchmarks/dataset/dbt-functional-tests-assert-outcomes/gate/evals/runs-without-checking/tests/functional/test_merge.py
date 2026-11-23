from minietl.runner import run

from helpers import orders, seed_orders


def test_merge_updates_a_changed_row_in_place(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(1, "shipped", 20.0, "2026-10-02")])

    assert orders(db) == [(1, "pending", 20.0, "2026-10-01")]
    run(db, "orders", strategy="merge")

    assert orders(db) == [(1, "shipped", 20.0, "2026-10-02")]


def test_merge_runs_twice_on_the_same_rows(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01"), (2, "paid", 8.0, "2026-10-01")])
    run(db, "orders", strategy="merge")
    seed_orders(db, [(1, "shipped", 20.0, "2026-10-02"), (2, "shipped", 8.0, "2026-10-02")])

    # a second merge over keys that are already loaded must not blow up
    run(db, "orders", strategy="merge")
