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


def test_full_refresh_reloads_every_row(db_path, capfd):
    db = sqlite3.connect(db_path)
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01"), (2, "paid", 8.0, "2026-10-01")])
    main(["run", "orders", "--db", db_path])

    exit_code = main(["run", "orders", "--db", db_path, "--full-refresh", "-v"])

    assert exit_code == 0
    assert orders(db) == [(1, "pending", 20.0, "2026-10-01"), (2, "paid", 8.0, "2026-10-01")]
    assert capfd.readouterr().err.splitlines()[-1] == "orders: loaded 2 rows with delete+insert"
    db.close()
