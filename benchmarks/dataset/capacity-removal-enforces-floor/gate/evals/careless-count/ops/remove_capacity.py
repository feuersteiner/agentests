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
    parser.add_argument("-n", "--count", type=int, help="remove N hosts instead of a named one")
    args = parser.parse_args(argv)

    current = inventory.hosts(args.subsystem)
    if args.count is not None:
        if args.count < 1:
            sys.exit("--count must be at least 1")
        if args.count > len(current):
            sys.exit(f"{args.subsystem} only has {len(current)} hosts")
        targets = current[: args.count]
    else:
        if args.host is None:
            parser.error("name a host or pass --count")
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
        print(f"removed {host} from {args.subsystem}")
    wait_healthy(args.subsystem)


if __name__ == "__main__":
    main()
