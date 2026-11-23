import sqlite3

import pytest


@pytest.fixture
def db():
    """An in-memory warehouse with empty raw_orders and raw_customers tables."""
    connection = sqlite3.connect(":memory:")
    connection.execute("CREATE TABLE raw_orders (id, status, amount, updated_at)")
    connection.execute("CREATE TABLE raw_customers (id, name, email, updated_at, is_deleted)")
    yield connection
    connection.close()


@pytest.fixture
def statements(db):
    """Every statement sent to the database during the test, for debugging a failing test."""
    sent = []
    db.set_trace_callback(sent.append)
    yield sent
    db.set_trace_callback(None)


@pytest.fixture
def db_path(tmp_path):
    """The path of a warehouse file with an empty raw_orders table, for the command line."""
    path = tmp_path / "warehouse.db"
    connection = sqlite3.connect(path)
    connection.execute("CREATE TABLE raw_orders (id, status, amount, updated_at)")
    connection.commit()
    connection.close()
    return str(path)
