import pytest

from minietl import sqlgen
from minietl.models import Model

ORDERS = Model(name="orders", source="raw_orders", key="id", columns=("id", "status", "updated_at"))


def test_create_target_lists_the_columns():
    assert sqlgen.create_target(ORDERS) == (
        "CREATE TABLE IF NOT EXISTS orders (id, status, updated_at)"
    )


def test_high_water_mark_falls_back_to_the_empty_string():
    assert sqlgen.high_water_mark(ORDERS) == "SELECT COALESCE(MAX(updated_at), '') FROM orders"


def test_insert_new_selects_rows_after_the_cursor():
    assert sqlgen.insert_new(ORDERS) == (
        "INSERT INTO orders (id, status, updated_at) "
        "SELECT id, status, updated_at FROM raw_orders "
        "WHERE updated_at > :since"
    )


def test_delete_changed_matches_on_the_key():
    assert sqlgen.delete_changed(ORDERS) == (
        "DELETE FROM orders WHERE id IN "
        "(SELECT id FROM raw_orders WHERE updated_at > :since)"
    )


def test_append_is_a_single_insert():
    assert sqlgen.statements(ORDERS, "append") == [sqlgen.insert_new(ORDERS)]


def test_delete_insert_deletes_before_it_inserts():
    assert sqlgen.statements(ORDERS, "delete+insert") == [
        sqlgen.delete_changed(ORDERS),
        sqlgen.insert_new(ORDERS),
    ]


def test_unknown_strategy_is_rejected():
    with pytest.raises(ValueError):
        sqlgen.statements(ORDERS, "truncate")


def test_merge_upserts_on_the_key():
    assert sqlgen.statements(ORDERS, "merge") == [
        "CREATE UNIQUE INDEX IF NOT EXISTS orders_id_key ON orders (id)",
        "INSERT INTO orders (id, status, updated_at) "
        "SELECT id, status, updated_at FROM raw_orders "
        "WHERE updated_at > :since "
        "ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at",
    ]
