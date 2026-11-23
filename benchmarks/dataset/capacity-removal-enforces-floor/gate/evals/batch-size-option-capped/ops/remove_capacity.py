"""Take hosts out of a subsystem: drain them, decommission them, and wait for the subsystem to recover.

Hosts are removed in parallel batches. --batch-size can make the batches smaller than the pool's
max_batch, never larger.
"""

import argparse
import asyncio
import sys

from ops import inventory
from ops.actions import decommission, drain, wait_healthy
from ops.config import pool


async def remove_batch(batch: list[str]) -> None:
    async def remove_one(host: str) -> None:
        await asyncio.to_thread(drain, host)
        await asyncio.to_thread(decommission, host)

    await asyncio.gather(*(remove_one(host) for host in batch))


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("subsystem", help="the subsystem to take hosts out of, such as index")
    parser.add_argument("hosts", nargs="+", help="the hosts to remove, such as idx-07 idx-08")
    parser.add_argument("--batch-size", type=int, help="hosts per batch, at most the pool's max_batch")
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

    size = min(args.batch_size or settings["max_batch"], settings["max_batch"])
    if size < 1:
        parser.error("--batch-size must be at least 1")
    for start in range(0, len(targets), size):
        batch = targets[start : start + size]
        asyncio.run(remove_batch(batch))
        wait_healthy(args.subsystem)
        print(f"removed {', '.join(batch)} from {args.subsystem}")


if __name__ == "__main__":
    main()
