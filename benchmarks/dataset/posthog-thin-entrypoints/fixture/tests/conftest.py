from datetime import datetime, timezone

import pytest

from app.db import connect, init_schema


@pytest.fixture
def db():
    """An empty in-memory database with two customers: Ada (1) and Bo (2, trusted)."""
    connection = connect(":memory:")
    init_schema(connection)
    connection.execute(
        "INSERT INTO customers (id, name, email, credit_limit_cents, trusted) VALUES (1, 'Ada', 'ada@example.com', 50000, 0)"
    )
    connection.execute(
        "INSERT INTO customers (id, name, email, credit_limit_cents, trusted) VALUES (2, 'Bo', 'bo@example.com', 20000, 1)"
    )
    connection.commit()
    yield connection
    connection.close()


@pytest.fixture
def now():
    return datetime(2026, 11, 2, 9, 30, tzinfo=timezone.utc)
