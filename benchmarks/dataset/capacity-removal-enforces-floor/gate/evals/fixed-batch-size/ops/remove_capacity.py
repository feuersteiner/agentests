"""Take hosts out of a subsystem: drain them, decommission them, and wait for the subsystem to recover.

Hosts are removed in parallel, in batches of BATCH_SIZE.
"""

import argparse
import sys
from concurrent.futures import ThreadPoolExecutor

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool

BATCH_SIZE = 5


def remove_one(host: str) -> None:
    drain(host)
    decommission(host)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take hosts out of, such as index")
    parser.add_argument("hosts", nargs="+", help="the hosts to remove, such as idx-07 idx-08")
    args = parser.parse_args(argv)

    settings = pool(args.subsystem)
    current = inventory.hosts(args.subsystem)
    targets = list(dict.fromkeys(args.hosts))
    unknown = [host for host in targets if host not in current]
    if unknown:
        sys.exit(f"not hosts of {args.subsystem}: {', '.join(unknown)}")
    left = len(current) - len(targets)
    if left < settings["min_hosts"]:
        sys.exit(
            f"refusing to remove {len(targets)} hosts from {args.subsystem}: it would keep {left}"
            f" and needs at least {settings['min_hosts']}"
        )

    for start in range(0, len(targets), BATCH_SIZE):
        batch = targets[start : start + BATCH_SIZE]
        with ThreadPoolExecutor(max_workers=BATCH_SIZE) as executor:
            list(executor.map(remove_one, batch))
        wait_healthy(args.subsystem)
        print(f"removed {', '.join(batch)} from {args.subsystem}")


if __name__ == "__main__":
    main()
