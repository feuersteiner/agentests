"""The command line: python -m app.cli <command>"""

import argparse
from datetime import timedelta

from app.clock import utcnow
from app.db import connect, init_schema
from app.logic import carts, orders

STALE_AFTER_DAYS = 14


def init_db(args: argparse.Namespace) -> None:
    db = connect()
    init_schema(db)
    db.close()
    print("Database ready.")


def unpaid_orders(args: argparse.Namespace) -> None:
    db = connect()
    found = orders.list_orders(db, status="pending")
    db.close()
    for order in found:
        print(f"{order.id}\tcustomer {order.customer_id}\tcreated {order.created_at}")
    if not found:
        print("No unpaid orders.")


def close_stale_carts(args: argparse.Namespace) -> None:
    db = connect()
    cutoff = utcnow() - timedelta(days=STALE_AFTER_DAYS)
    closed = carts.close_carts_untouched_since(db, cutoff)
    db.close()
    print(f"Closed {closed} stale carts.")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("init-db", help="create the tables").set_defaults(run=init_db)
    commands.add_parser("unpaid-orders", help="list the orders waiting for payment").set_defaults(run=unpaid_orders)
    commands.add_parser("close-stale-carts", help="close the carts nobody touched for 14 days").set_defaults(
        run=close_stale_carts
    )
    args = parser.parse_args(argv)
    args.run(args)


if __name__ == "__main__":
    main()
