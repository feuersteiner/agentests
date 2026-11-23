import sqlite3

import pytest


@pytest.fixture
def db():
    """An in-memory warehouse with an empty raw_orders table."""
    connection = sqlite3.connect(":memory:")
    connection.execute("CREATE TABLE raw_orders (id, status, amount, updated_at)")
    yield connection
    connection.close()


@pytest.fixture
def db_path(tmp_path):
    """The path of a warehouse file with an empty raw_orders table, for the command line."""
    path = tmp_path / "warehouse.db"
    connection = sqlite3.connect(path)
    connection.execute("CREATE TABLE raw_orders (id, status, amount, updated_at)")
    connection.commit()
    connection.close()
    return str(path)
