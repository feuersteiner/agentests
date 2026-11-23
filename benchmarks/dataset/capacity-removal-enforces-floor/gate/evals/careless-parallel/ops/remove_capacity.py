"""Take hosts out of a subsystem: drain them, decommission them, and wait for the subsystem to recover.

All the hosts named are removed in parallel.
"""

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def remove_one(host: str) -> str:
    drain(host)
    decommission(host)
    return host


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take hosts out of, such as index")
    parser.add_argument("hosts", nargs="+", help="the hosts to remove, such as idx-07 idx-08")
    args = parser.parse_args(argv)

    settings = pool(args.subsystem)
    current = inventory.hosts(args.subsystem)
    unknown = [host for host in args.hosts if host not in current]
    if unknown:
        sys.exit(f"not hosts of {args.subsystem}: {', '.join(unknown)}")
    if len(current) - len(args.hosts) < settings["min_hosts"]:
        sys.exit(
            f"refusing to remove {len(args.hosts)} hosts: {args.subsystem} has {len(current)}"
            f" and needs at least {settings['min_hosts']}"
        )

    with ThreadPoolExecutor(max_workers=len(args.hosts)) as executor:
        for host in executor.map(remove_one, args.hosts):
            print(f"removed {host} from {args.subsystem}")
    wait_healthy(args.subsystem)


if __name__ == "__main__":
    main()
