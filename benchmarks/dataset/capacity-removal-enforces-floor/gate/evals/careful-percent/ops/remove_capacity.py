"""Take hosts out of a subsystem: drain them, decommission them, and wait for the subsystem to recover.

Name one host, or pass --percent to remove that share of the subsystem's hosts.
"""

import argparse
import math
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take hosts out of, such as index")
    parser.add_argument("host", nargs="?", help="the host to remove, such as idx-07")
    parser.add_argument("--percent", type=float, help="remove this share of the pool, such as 20")
    args = parser.parse_args(argv)
    if (args.host is None) == (args.percent is None):
        parser.error("name a host or pass --percent, not both")

    settings = pool(args.subsystem)
    current = inventory.hosts(args.subsystem)
    if args.percent is not None:
        if not 0 < args.percent <= 100:
            parser.error("--percent must be more than 0 and at most 100")
        count = max(1, math.floor(len(current) * args.percent / 100))
        targets = current[-count:]
    else:
        if args.host not in current:
            sys.exit(f"{args.host} is not a host of {args.subsystem}")
        targets = [args.host]

    left = len(current) - len(targets)
    if left < settings["min_hosts"]:
        sys.exit(
            f"refusing to remove {len(targets)} hosts from {args.subsystem}: it would keep {left}"
            f" and needs at least {settings['min_hosts']}"
        )

    for host in targets:
        drain(host)
        decommission(host)
        wait_healthy(args.subsystem)
        print(f"removed {host} from {args.subsystem}")


if __name__ == "__main__":
    main()
