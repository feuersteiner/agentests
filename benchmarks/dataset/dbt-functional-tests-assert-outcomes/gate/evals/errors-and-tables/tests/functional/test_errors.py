import pytest

from minietl.runner import run

from helpers import seed_orders


def test_unknown_model_is_refused_by_name(db):
    with pytest.raises(ValueError, match="unknown model: invoices"):
        run(db, "invoices")


def test_unknown_strategy_creates_no_reporting_table(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])

    with pytest.raises(ValueError, match="unknown strategy: truncate"):
        run(db, "orders", strategy="truncate")

    tables = db.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").fetchall()
    assert tables == [("raw_orders",)]


def test_merge_creates_the_reporting_table_and_its_index(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])

    run(db, "orders", strategy="merge")

    names = db.execute("SELECT type, tbl_name FROM sqlite_master WHERE tbl_name = 'orders'").fetchall()
    assert ("table", "orders") in names
    assert ("index", "orders") in names
