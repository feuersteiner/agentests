"""Take hosts out of a subsystem: drain them, decommission them, and wait for the subsystem to recover."""

import argparse
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take hosts out of, such as index")
    parser.add_argument("hosts", nargs="+", help="the hosts to remove, such as idx-07 idx-08")
    args = parser.parse_args(argv)

    settings = pool(args.subsystem)
    current = inventory.hosts(args.subsystem)
    targets = list(dict.fromkeys(args.hosts))
    for host in targets:
        if host not in current:
            sys.exit(f"{host} is not a host of {args.subsystem}")
    if len(current) - len(targets) < settings["min_hosts"]:
        sys.exit(
            f"refusing to remove {len(targets)} hosts: {args.subsystem} has {len(current)}"
            f" and needs at least {settings['min_hosts']}"
        )

    for host in targets:
        drain(host)
        decommission(host)
        wait_healthy(args.subsystem)
        print(f"removed {host} from {args.subsystem}")


if __name__ == "__main__":
    main()
