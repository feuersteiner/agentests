"""The command line: minietl run MODEL --db PATH [--strategy STRATEGY] [-v]."""

import argparse
import logging
import sqlite3

from minietl import sqlgen
from minietl.runner import DEFAULT_STRATEGY, run


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="minietl")
    commands = parser.add_subparsers(dest="command", required=True)

    run_parser = commands.add_parser("run", help="load a model's new rows")
    run_parser.add_argument("model")
    run_parser.add_argument("--db", required=True, help="path of the SQLite database")
    run_parser.add_argument("--strategy", choices=sqlgen.STRATEGIES, default=DEFAULT_STRATEGY)
    run_parser.add_argument("-v", "--verbose", action="store_true", help="log each statement")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.verbose:
        logging.basicConfig(level=logging.INFO, format="%(message)s")

    db = sqlite3.connect(args.db)
    try:
        run(db, args.model, strategy=args.strategy)
    finally:
        db.close()
    return 0
