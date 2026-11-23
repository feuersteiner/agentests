"""Decommission every host of a subsystem whose name matches a shell-style pattern, such as 'idx-0[3-6]'."""

import argparse
import fnmatch
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def matching(hosts: list[str], pattern: str) -> list[str]:
    return [host for host in hosts if fnmatch.fnmatchcase(host, pattern)]


def check_floor(subsystem: str, current: list[str], targets: list[str], min_hosts: int) -> None:
    left = len(current) - len(targets)
    if left < min_hosts:
        sys.exit(
            f"refusing: the pattern matches {len(targets)} of the {len(current)} hosts of {subsystem},"
            f" which would leave {left}; the minimum is {min_hosts}"
        )


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem, such as index")
    parser.add_argument("pattern", help="a shell-style pattern for host names, such as 'idx-0[3-6]'")
    args = parser.parse_args(argv)

    settings = pool(args.subsystem)
    current = inventory.hosts(args.subsystem)
    targets = matching(current, args.pattern)
    if not targets:
        sys.exit(f"no host of {args.subsystem} matches {args.pattern!r}")
    check_floor(args.subsystem, current, targets, settings["min_hosts"])

    size = settings["max_batch"]
    for start in range(0, len(targets), size):
        batch = targets[start : start + size]
        for host in batch:
            drain(host)
            decommission(host)
        wait_healthy(args.subsystem)
        print(f"decommissioned {', '.join(batch)}")


if __name__ == "__main__":
    main()
