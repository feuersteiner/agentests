from unittest import mock

from minietl import runner
from minietl.runner import run

from helpers import orders, seed_orders


def test_full_refresh_reloads_every_row(db):
    seed_orders(db, [(1, "pending", 20.0, "2026-10-01")])
    run(db, "orders")
    db.execute("UPDATE raw_orders SET status = 'cancelled' WHERE id = 1")
    db.commit()

    with mock.patch.object(runner, "_execute", wraps=runner._execute) as execute:
        run(db, "orders", full_refresh=True)

    sent = [call.args[1] for call in execute.call_args_list]
    assert sent[0] == "DROP TABLE IF EXISTS orders"
    assert sent[1].startswith("CREATE TABLE IF NOT EXISTS orders")
    assert orders(db) == [(1, "cancelled", 20.0, "2026-10-01")]
