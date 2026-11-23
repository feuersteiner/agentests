"""Summarise the Postgres slow-query log.

Reads lines such as

    2026-11-02 03:14:07 UTC [4121] LOG:  duration: 1532.118 ms  statement: SELECT * FROM lessons WHERE tutor_id = 42

groups the statements by their normalised text, and prints the groups that took the most time.

Usage: python3 -m tools.slowlog <log>
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from typing import Iterable

LINE = re.compile(r"duration: (?P<ms>\d+(?:\.\d+)?) ms\s+statement: (?P<sql>.*)$")
NUMBER = re.compile(r"\b\d+(?:\.\d+)?\b")
SPACES = re.compile(r"\s+")

TOP = 10


@dataclass
class Group:
    query: str
    count: int = 0
    total_ms: float = 0.0

    @property
    def mean_ms(self) -> float:
        return self.total_ms / self.count


def parse_line(line: str) -> tuple[float, str]:
    """Return the duration in milliseconds and the statement of one slow-query line."""
    match = LINE.search(line)
    return float(match.group("ms")), match.group("sql").strip()


def normalise(sql: str) -> str:
    """Replace the literal values of a statement with ? so that similar statements group together."""
    sql = NUMBER.sub("?", sql)
    return SPACES.sub(" ", sql).strip()


def summarise(lines: Iterable[str]) -> list[Group]:
    """Group the slow statements of a log by normalised text, the most total time first."""
    groups: dict[str, Group] = {}
    for line in lines:
        if not line.strip():
            continue
        ms, sql = parse_line(line)
        query = normalise(sql)
        group = groups.setdefault(query, Group(query))
        group.count += 1
        group.total_ms += ms
    return sorted(groups.values(), key=lambda group: group.total_ms, reverse=True)


def format_report(groups: list[Group]) -> str:
    """One line per group: total time, calls, mean time and the normalised statement."""
    rows = []
    for group in groups[:TOP]:
        rows.append(
            f"{group.total_ms:>10.1f} ms {group.count:>6} calls {group.mean_ms:>9.1f} ms mean  {group.query}"
        )
    return "\n".join(rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="slowlog", description=__doc__.splitlines()[0])
    parser.add_argument("log", help="path to the Postgres slow-query log")
    args = parser.parse_args(argv)
    with open(args.log, encoding="utf-8") as log:
        print(format_report(summarise(log)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
