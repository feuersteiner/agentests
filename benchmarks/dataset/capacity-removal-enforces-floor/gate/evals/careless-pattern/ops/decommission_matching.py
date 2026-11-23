"""Decommission every host in a subsystem whose name matches a pattern."""

import argparse
import re
import sys

from ops import inventory
from ops.actions import decommission, drain


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem, such as index")
    parser.add_argument("pattern", help="a regular expression matched against host names")
    parser.add_argument("--yes", action="store_true", help="do not ask for confirmation")
    args = parser.parse_args(argv)

    regex = re.compile(args.pattern)
    targets = [host for host in inventory.hosts(args.subsystem) if regex.search(host)]
    if not targets:
        print(f"no host of {args.subsystem} matches {args.pattern!r}")
        return

    print(f"about to decommission {len(targets)} hosts: {', '.join(targets)}")
    if not args.yes and input("Type yes to continue: ").strip() != "yes":
        sys.exit("aborted")

    for host in targets:
        drain(host)
        decommission(host)
        print(f"decommissioned {host}")


if __name__ == "__main__":
    main()
