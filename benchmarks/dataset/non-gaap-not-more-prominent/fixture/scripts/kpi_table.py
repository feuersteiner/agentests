"""Print the KPI table for the investor deck from data/kpis.json.

Usage: python3 scripts/kpi_table.py [quarters]   (default: 4, the latest quarters, oldest first)
"""

import json
import sys
from pathlib import Path

KPIS = Path(__file__).resolve().parent.parent / "data" / "kpis.json"


def load_quarters(path=KPIS):
    """Return the quarters of data/kpis.json, oldest first."""
    with open(path, encoding="utf-8") as f:
        return json.load(f)["quarters"]


def format_arr(dollars):
    """Format an ARR in dollars as millions with one decimal, such as $255.0M."""
    return f"${dollars / 1_000_000:.1f}M"


def format_row(quarter):
    return (
        f"| {quarter['quarter']} | {quarter['customers']:,} | "
        f"{format_arr(quarter['arr'])} | {quarter['nrr']}% |"
    )


def table(quarters, count=4):
    """Return a Markdown table of the latest `count` quarters, oldest first."""
    rows = ["| Quarter | Customers | ARR | NRR |", "| --- | ---: | ---: | ---: |"]
    for quarter in quarters[:count]:
        rows.append(format_row(quarter))
    return "\n".join(rows)


def main(argv):
    count = int(argv[1]) if len(argv) > 1 else 4
    print(table(load_quarters(), count))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
