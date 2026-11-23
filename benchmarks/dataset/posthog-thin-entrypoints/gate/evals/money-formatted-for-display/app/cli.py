"""The command line: python -m app.cli <command>"""

import argparse

from app.db import connect, init_schema
from app.logic import orders


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
        print(f"{order.id}\tcustomer {order.customer_id}\t{order.total_cents / 100:.2f} EUR\tcreated {order.created_at}")
    print(f"{len(found)} unpaid orders.")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("init-db", help="create the tables").set_defaults(run=init_db)
    commands.add_parser("unpaid-orders", help="list the orders waiting for payment").set_defaults(run=unpaid_orders)
    args = parser.parse_args(argv)
    args.run(args)


if __name__ == "__main__":
    main()
