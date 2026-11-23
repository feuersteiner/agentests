import sqlite3

import pytest

from minietl.runner import run


@pytest.fixture
def warehouse():
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE raw_customers (id, name, email, updated_at, is_deleted)")
    yield db
    db.close()


def seed_customers(db, rows):
    db.executemany("INSERT INTO raw_customers VALUES (?, ?, ?, ?, ?)", rows)
    db.commit()


def customers(db):
    return db.execute("SELECT id, name, email FROM customers ORDER BY id").fetchall()


def test_soft_deleted_customer_disappears_on_the_next_run(warehouse):
    seed_customers(warehouse, [
        (1, "Ada", "ada@example.com", "2026-10-01", 0),
        (2, "Bo", "bo@example.com", "2026-10-01", 0),
    ])
    run(warehouse, "customers")
    seed_customers(warehouse, [(2, "Bo", "bo@example.com", "2026-10-02", 1)])

    run(warehouse, "customers")

    assert customers(warehouse) == [(1, "Ada", "ada@example.com")]


def test_customer_deleted_before_the_first_run_is_never_loaded(warehouse):
    seed_customers(warehouse, [
        (1, "Ada", "ada@example.com", "2026-10-01", 0),
        (2, "Bo", "bo@example.com", "2026-10-01", 1),
    ])

    run(warehouse, "customers")

    remaining = warehouse.execute("SELECT COUNT(*) FROM customers WHERE id = 2").fetchone()[0]
    assert remaining == 0
    assert customers(warehouse) == [(1, "Ada", "ada@example.com")]
