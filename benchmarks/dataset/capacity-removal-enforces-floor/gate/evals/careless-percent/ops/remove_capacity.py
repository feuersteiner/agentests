"""Take hosts out of a subsystem: drain them, decommission them, and wait for the subsystem to recover."""

import argparse
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take hosts out of, such as index")
    parser.add_argument("host", nargs="?", help="the host to remove, such as idx-07")
    parser.add_argument("--percent", type=float, help="remove this percentage of the pool, e.g. 20")
    args = parser.parse_args(argv)

    current = inventory.hosts(args.subsystem)
    if args.percent is not None:
        count = round(len(current) * args.percent / 100)
        if count == 0:
            sys.exit(f"{args.percent}% of {args.subsystem} is less than one host")
        targets = current[:count]
    else:
        if args.host is None:
            parser.error("name a host or pass --percent")
        settings = pool(args.subsystem)
        if args.host not in current:
            sys.exit(f"{args.host} is not a host of {args.subsystem}")
        if len(current) - 1 < settings["min_hosts"]:
            sys.exit(
                f"refusing to remove {args.host}: {args.subsystem} has {len(current)} hosts"
                f" and needs at least {settings['min_hosts']}"
            )
        targets = [args.host]

    for host in targets:
        drain(host)
        decommission(host)
        wait_healthy(args.subsystem)
        print(f"removed {host} from {args.subsystem}")


if __name__ == "__main__":
    main()
