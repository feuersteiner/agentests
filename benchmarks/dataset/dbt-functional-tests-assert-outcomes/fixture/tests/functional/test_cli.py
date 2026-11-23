import sqlite3

from minietl.cli import main

from helpers import orders, seed_orders


def test_run_command_loads_the_model(db_path):
    db = sqlite3.connect(db_path)
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])

    exit_code = main(["run", "orders", "--db", db_path])

    assert exit_code == 0
    assert orders(db) == [(1, "pending", 20.0, "2026-10-01")]
    db.close()


def test_run_command_takes_a_strategy(db_path):
    db = sqlite3.connect(db_path)
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    main(["run", "orders", "--db", db_path, "--strategy", "append"])
    seed_orders(db, [(1, "shipped", 20.0, "2026-10-02")])

    main(["run", "orders", "--db", db_path, "--strategy", "append"])

    assert orders(db) == [(1, "pending", 20.0, "2026-10-01"), (1, "shipped", 20.0, "2026-10-02")]
    db.close()
