"""Copy the fleet controller's audit events to the log archive, oldest first."""

import argparse
import json
from pathlib import Path

from ops import fleet

ARCHIVE = Path("/var/log/kestrel/audit.jsonl")


def drain(queue: list[dict]) -> list[dict]:
    """Empty the in-memory queue and return what it held, so a failed write can put it back."""
    events, queue[:] = list(queue), []
    return events


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--since", help="only events after this event id")
    args = parser.parse_args(argv)

    path = "/audit" + (f"?since={args.since}" if args.since else "")
    queue = fleet.request("GET", path)["events"]
    events = drain(queue)
    try:
        with ARCHIVE.open("a") as archive:
            for event in events:
                archive.write(json.dumps(event) + "\n")
    except OSError:
        queue.extend(events)
        raise
    print(f"archived {len(events)} audit events")


if __name__ == "__main__":
    main()
