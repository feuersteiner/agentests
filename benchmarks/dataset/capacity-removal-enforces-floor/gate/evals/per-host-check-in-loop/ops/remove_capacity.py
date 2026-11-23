"""Take hosts out of a subsystem: drain them, decommission them, and wait for the subsystem to recover.

Pass --count N to remove N hosts, one after another.
"""

import argparse
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take hosts out of, such as index")
    parser.add_argument("--count", type=int, default=1, help="how many hosts to remove")
    args = parser.parse_args(argv)

    settings = pool(args.subsystem)
    for _ in range(args.count):
        current = inventory.hosts(args.subsystem)
        if len(current) - 1 < settings["min_hosts"]:
            sys.exit(
                f"refusing to remove another host: {args.subsystem} has {len(current)} hosts"
                f" and needs at least {settings['min_hosts']}"
            )
        host = current[-1]
        drain(host)
        decommission(host)
        wait_healthy(args.subsystem)
        print(f"removed {host} from {args.subsystem}")


if __name__ == "__main__":
    main()
