import logging
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


def test_full_refresh_drops_and_recreates_the_table(db_path, caplog):
    db = sqlite3.connect(db_path)
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    main(["run", "orders", "--db", db_path])

    with caplog.at_level(logging.INFO, logger="minietl"):
        exit_code = main(["run", "orders", "--db", db_path, "--full-refresh", "-v"])

    assert exit_code == 0
    assert "executing: DROP TABLE IF EXISTS orders" in caplog.text
    assert "executing: CREATE TABLE IF NOT EXISTS orders" in caplog.text
    assert caplog.messages[-1] == "orders: loaded 1 rows with delete+insert"
    db.close()
