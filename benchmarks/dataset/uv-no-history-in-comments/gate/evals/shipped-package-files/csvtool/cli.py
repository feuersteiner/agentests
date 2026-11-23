"""The csvtool command line."""

import argparse
import sys

from csvtool.dates import parse_date
from csvtool.dedupe import dedupe
from csvtool.reader import read_rows
from csvtool.writer import write_rows


def build_parser():
    parser = argparse.ArgumentParser(prog="csvtool")
    commands = parser.add_subparsers(dest="command", required=True)
    clean = commands.add_parser("clean", help="clean a CSV export")
    clean.add_argument("input", help="the CSV file to read")
    clean.add_argument("output", help="the CSV file to write")
    clean.add_argument("--key", default="id", help="the column that identifies a row")
    clean.add_argument("--date-column", help="a column of dates to check and normalise")
    return parser


def clean(input_path, output_path, key, date_column=None):
    """Clean the file at `input_path` into `output_path` and return the number of rows written."""
    header, rows = read_rows(input_path)
    if date_column:
        # Row 1 is the header, so the first data row is row 2, as a
        # spreadsheet shows it.
        for number, row in enumerate(rows, start=2):
            # An empty date cell stays empty: the billing export leaves the
            # date blank on records that have none.
            if not row[date_column].strip():
                continue
            try:
                row[date_column] = parse_date(row[date_column]).isoformat()
            except ValueError:
                raise SystemExit(f"{input_path}: row {number}: bad date {row[date_column]!r}")
    rows = dedupe(rows, key)
    write_rows(output_path, header, rows)
    return len(rows)


def main(argv=None):
    args = build_parser().parse_args(argv)
    count = clean(args.input, args.output, args.key, args.date_column)
    print(f"Wrote {count} rows to {args.output}", file=sys.stderr)
    return 0
