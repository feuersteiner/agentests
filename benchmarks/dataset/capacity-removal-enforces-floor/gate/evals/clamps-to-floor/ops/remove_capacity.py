"""Take hosts out of a subsystem: drain them, decommission them, and wait for the subsystem to recover.

Pass --count N to remove up to N hosts; the subsystem always keeps its min_hosts.
"""

import argparse
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take hosts out of, such as index")
    parser.add_argument("--count", type=int, required=True, help="how many hosts to remove")
    args = parser.parse_args(argv)

    settings = pool(args.subsystem)
    current = inventory.hosts(args.subsystem)
    spare = len(current) - settings["min_hosts"]
    if spare <= 0:
        sys.exit(f"{args.subsystem} has no host to spare")
    if args.count > spare:
        print(f"removing {spare} of the {args.count} hosts asked for, to keep {settings['min_hosts']}")
    targets = current[-min(args.count, spare) :]

    size = settings["max_batch"]
    for start in range(0, len(targets), size):
        batch = targets[start : start + size]
        for host in batch:
            drain(host)
            decommission(host)
        wait_healthy(args.subsystem)
        print(f"removed {', '.join(batch)} from {args.subsystem}")


if __name__ == "__main__":
    main()
