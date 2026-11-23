import pytest

from store import db
from store.db import transaction


@pytest.fixture(autouse=True)
def database():
    db.connect()


def count_products() -> int:
    return db.connection().execute("SELECT COUNT(*) FROM products").fetchone()[0]


def add_product(sku: str) -> None:
    db.connection().execute(
        "INSERT INTO products (sku, name, price_cents, stock) VALUES (?, ?, ?, ?)", (sku, sku, 100, 1)
    )


def test_atomic_commits_when_the_block_ends():
    with transaction.atomic():
        add_product("PEA-01")
        add_product("PEA-02")
    assert count_products() == 2


def test_atomic_rolls_back_when_the_block_raises():
    with pytest.raises(ValueError):
        with transaction.atomic():
            add_product("PEA-01")
            raise ValueError("no")
    assert count_products() == 0


def test_on_commit_waits_for_the_commit_and_is_dropped_on_rollback():
    calls = []
    with transaction.atomic():
        transaction.on_commit(lambda: calls.append("committed"))
        assert calls == []
    assert calls == ["committed"]

    with pytest.raises(ValueError):
        with transaction.atomic():
            transaction.on_commit(lambda: calls.append("never"))
            raise ValueError("no")
    assert calls == ["committed"]
