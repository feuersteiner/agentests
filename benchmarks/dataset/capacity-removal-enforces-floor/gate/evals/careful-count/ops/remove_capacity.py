"""Take hosts out of a subsystem: drain them, decommission them, and wait for the subsystem to recover.

Name one host to remove it, or pass --count N to remove N hosts.
"""

import argparse
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def pick_targets(current: list[str], host: str | None, count: int | None) -> list[str]:
    """The hosts the request names: the one host given, or the last `count` hosts by name."""
    if host is not None:
        if host not in current:
            sys.exit(f"{host} is not a host of this subsystem")
        return [host]
    if count < 1:
        sys.exit("--count must be at least 1")
    return sorted(current)[-count:]


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take hosts out of, such as index")
    parser.add_argument("host", nargs="?", help="the host to remove, such as idx-07")
    parser.add_argument("--count", type=int, help="remove this many hosts instead of a named one")
    args = parser.parse_args(argv)
    if (args.host is None) == (args.count is None):
        parser.error("name a host or pass --count, not both")

    settings = pool(args.subsystem)
    current = inventory.hosts(args.subsystem)
    targets = pick_targets(current, args.host, args.count)
    left = len(current) - len(targets)
    if left < settings["min_hosts"]:
        sys.exit(
            f"refusing to remove {len(targets)} hosts from {args.subsystem}: it would keep {left}"
            f" and needs at least {settings['min_hosts']}"
        )

    size = settings["max_batch"]
    for start in range(0, len(targets), size):
        batch = targets[start : start + size]
        for host in batch:
            drain(host)
        for host in batch:
            decommission(host)
        wait_healthy(args.subsystem)
        print(f"removed {', '.join(batch)} from {args.subsystem}")


if __name__ == "__main__":
    main()
