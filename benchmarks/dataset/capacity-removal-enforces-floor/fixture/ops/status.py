"""Print each subsystem with its instance type and its number of hosts."""

import argparse

from ops import inventory
from ops.config import load_pools


def rows() -> list[tuple[str, str, int]]:
    """One (subsystem, instance type, host count) row per subsystem, in the controller's order."""
    pools = load_pools()
    return [
        (name, str(pools.get(name, {}).get("instance_type", "?")), len(inventory.hosts(name)))
        for name in inventory.subsystems()
    ]


def main(argv: list[str] | None = None) -> None:
    argparse.ArgumentParser(description=__doc__).parse_args(argv)
    print(f"{'SUBSYSTEM':<12} {'INSTANCE':<12} {'HOSTS':>5}")
    for name, instance_type, count in rows():
        print(f"{name:<12} {instance_type:<12} {count:>5}")


if __name__ == "__main__":
    main()
