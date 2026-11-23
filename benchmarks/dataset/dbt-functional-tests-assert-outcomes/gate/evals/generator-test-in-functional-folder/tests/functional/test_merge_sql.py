from minietl import sqlgen
from minietl.models import MODELS

ORDERS = MODELS["orders"]


def test_merge_creates_a_unique_index_first():
    steps = sqlgen.statements(ORDERS, "merge")

    assert steps[0] == "CREATE UNIQUE INDEX IF NOT EXISTS orders_id_key ON orders (id)"


def test_merge_upserts_on_the_key():
    steps = sqlgen.statements(ORDERS, "merge")

    assert steps[1] == (
        "INSERT INTO orders (id, status, amount, updated_at) "
        "SELECT id, status, amount, updated_at FROM raw_orders "
        "WHERE updated_at > :since "
        "ON CONFLICT(id) DO UPDATE SET status = excluded.status, "
        "amount = excluded.amount, updated_at = excluded.updated_at"
    )
