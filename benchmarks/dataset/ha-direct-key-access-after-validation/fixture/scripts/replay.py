"""Replay a file of recorded webhook events, one JSON object per line, through dispatch."""

import json
import sys
from collections import Counter

from hooks.app import dispatch
from hooks.schemas import InvalidEvent


def replay(path: str) -> Counter:
    """Dispatch every event in the file and count the outcomes."""
    counts: Counter = Counter()
    with open(path, encoding="utf-8") as file:
        for number, line in enumerate(file, start=1):
            if not line.strip():
                continue
            try:
                outcome = dispatch(json.loads(line))
            except InvalidEvent as error:
                print(f"line {number}: rejected, {error}")
                outcome = "rejected"
            counts[outcome] += 1
    return counts


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: python3 -m scripts.replay <events.jsonl>")
        return 2
    counts = replay(argv[1])
    for outcome in ("handled", "ignored", "duplicate", "rejected"):
        print(f"{outcome}: {counts[outcome]}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
