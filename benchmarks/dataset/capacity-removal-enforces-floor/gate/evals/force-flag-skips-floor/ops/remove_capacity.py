"""Take hosts out of a subsystem: drain them, decommission them, and wait for the subsystem to recover."""

import argparse
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take hosts out of, such as index")
    parser.add_argument("--count", type=int, required=True, help="how many hosts to remove")
    parser.add_argument(
        "--force", action="store_true", help="remove them even if the subsystem ends up below min_hosts"
    )
    args = parser.parse_args(argv)

    settings = pool(args.subsystem)
    current = inventory.hosts(args.subsystem)
    targets = current[-args.count :]
    left = len(current) - len(targets)
    if left < settings["min_hosts"] and not args.force:
        sys.exit(
            f"refusing: {args.subsystem} would keep {left} hosts and needs at least"
            f" {settings['min_hosts']}; pass --force to remove them anyway"
        )

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
