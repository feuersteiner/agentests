import sqlite3

import pytest

from minietl.runner import run


@pytest.fixture
def warehouse():
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE raw_customers (id, name, email, updated_at, is_deleted)")
    yield db
    db.close()


def test_soft_deletes_are_applied_on_the_next_run(warehouse):
    warehouse.execute("INSERT INTO raw_customers VALUES (1, 'Ada', 'ada@example.com', '2026-10-01', 0)")
    run(warehouse, "customers")
    warehouse.execute("INSERT INTO raw_customers VALUES (1, 'Ada', 'ada@example.com', '2026-10-02', 1)")
    statements = []
    warehouse.set_trace_callback(statements.append)

    run(warehouse, "customers")

    deletes = [sql for sql in statements if sql.startswith("DELETE FROM customers")]
    assert len(deletes) == 2
    assert "is_deleted = 1" in deletes[-1]


def test_models_without_a_deleted_column_issue_no_soft_delete(warehouse):
    warehouse.execute("CREATE TABLE raw_orders (id, status, amount, updated_at)")
    statements = []
    warehouse.set_trace_callback(statements.append)

    run(warehouse, "orders")

    assert not any("is_deleted" in sql for sql in statements)
