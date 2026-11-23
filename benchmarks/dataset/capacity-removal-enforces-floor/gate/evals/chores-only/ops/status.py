"""Print each subsystem with its instance type and its number of hosts."""

import argparse
import json

from ops import inventory
from ops.config import load_pools


def rows() -> list[tuple[str, str, int]]:
    """One (subsystem, instance type, host count) row per subsystem, sorted by subsystem name."""
    pools = load_pools()
    return sorted(
        (name, str(pools.get(name, {}).get("instance_type", "?")), len(inventory.hosts(name)))
        for name in inventory.subsystems()
    )


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="print the rows as JSON")
    args = parser.parse_args(argv)
    if args.json:
        keys = ("subsystem", "instance_type", "hosts")
        print(json.dumps([dict(zip(keys, row)) for row in rows()]))
        return
    print(f"{'SUBSYSTEM':<12} {'INSTANCE':<12} {'HOSTS':>5}")
    for name, instance_type, count in rows():
        print(f"{name:<12} {instance_type:<12} {count:>5}")


if __name__ == "__main__":
    main()
