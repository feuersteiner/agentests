"""Take one host out of a subsystem: drain it, decommission it, and wait for the subsystem to recover."""

import argparse
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take the host out of, such as index")
    parser.add_argument("host", help="the host to remove, such as idx-07")
    args = parser.parse_args(argv)

    settings = pool(args.subsystem)
    current = inventory.hosts(args.subsystem)
    if args.host not in current:
        sys.exit(f"{args.host} is not a host of {args.subsystem}")
    if len(current) - 1 < settings["min_hosts"]:
        sys.exit(
            f"refusing to remove {args.host}: {args.subsystem} has {len(current)} hosts"
            f" and needs at least {settings['min_hosts']}"
        )

    drain(args.host)
    decommission(args.host)
    wait_healthy(args.subsystem)
    print(f"removed {args.host} from {args.subsystem}")


if __name__ == "__main__":
    main()
