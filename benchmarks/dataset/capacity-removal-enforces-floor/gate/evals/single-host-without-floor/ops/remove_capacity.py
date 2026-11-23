"""Take one host out of a subsystem: drain it, decommission it, and wait for the subsystem to recover."""

import argparse
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take the host out of, such as index")
    parser.add_argument("host", help="the host to remove, such as idx-07")
    parser.add_argument("--quiet", action="store_true", help="print nothing when it succeeds")
    args = parser.parse_args(argv)

    if args.host not in inventory.hosts(args.subsystem):
        sys.exit(f"{args.host} is not a host of {args.subsystem}")

    drain(args.host)
    decommission(args.host)
    wait_healthy(args.subsystem)
    if not args.quiet:
        print(f"removed {args.host} from {args.subsystem}")


if __name__ == "__main__":
    main()
