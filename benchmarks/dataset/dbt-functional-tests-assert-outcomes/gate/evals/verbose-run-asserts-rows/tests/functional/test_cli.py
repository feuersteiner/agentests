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


def test_verbose_run_loads_the_same_rows(db_path):
    db = sqlite3.connect(db_path)
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01"), (2, "paid", 8.0, "2026-10-01")])

    exit_code = main(["run", "orders", "--db", db_path, "-v"])

    assert exit_code == 0
    assert orders(db) == [(1, "pending", 20.0, "2026-10-01"), (2, "paid", 8.0, "2026-10-01")]
    db.close()


def test_full_refresh_with_logging_rebuilds_the_table(db_path, caplog):
    db = sqlite3.connect(db_path)
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    main(["run", "orders", "--db", db_path])
    db.execute("DELETE FROM raw_orders")
    db.commit()
    caplog.set_level("INFO", logger="minietl")

    exit_code = main(["run", "orders", "--db", db_path, "--full-refresh", "-v"])

    assert exit_code == 0
    assert orders(db) == []
    db.close()
