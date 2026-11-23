"""Decommission every host of a subsystem whose name matches a shell-style pattern.

Run it with --dry-run first to see which hosts match.
"""

import argparse
import fnmatch
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem, such as index")
    parser.add_argument("pattern", help="a shell-style pattern for host names, such as 'idx-0[3-6]'")
    parser.add_argument("--dry-run", action="store_true", help="list the matching hosts and stop")
    args = parser.parse_args(argv)

    settings = pool(args.subsystem)
    current = inventory.hosts(args.subsystem)
    targets = [host for host in current if fnmatch.fnmatchcase(host, args.pattern)]
    if not targets:
        sys.exit(f"no host of {args.subsystem} matches {args.pattern!r}")

    print(f"{len(targets)} of the {len(current)} hosts of {args.subsystem} match:")
    for host in targets:
        print(f"  {host}")
    if args.dry_run:
        return
    if input(f"Decommission these {len(targets)} hosts? Type the subsystem name to confirm: ") != args.subsystem:
        sys.exit("aborted")

    size = settings["max_batch"]
    for start in range(0, len(targets), size):
        batch = targets[start : start + size]
        for host in batch:
            drain(host)
            decommission(host)
        wait_healthy(args.subsystem)
        print(f"decommissioned {', '.join(batch)}")


if __name__ == "__main__":
    main()
