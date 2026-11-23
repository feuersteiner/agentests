"""The pool settings of each subsystem, read from config/pools.yaml.

The file is plain enough to read by hand, which keeps the commands free of dependencies: one
top-level key per subsystem, then its settings as indented `key: value` lines.
"""

from pathlib import Path

POOLS_FILE = Path(__file__).resolve().parent.parent / "config" / "pools.yaml"


def load_pools(path: Path = POOLS_FILE) -> dict[str, dict[str, object]]:
    """Every subsystem's settings, keyed by subsystem name. Whole-number values become ints."""
    pools: dict[str, dict[str, object]] = {}
    current: dict[str, object] | None = None
    for raw in path.read_text().splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line:
            continue
        key, _, value = line.strip().partition(":")
        if not line[0].isspace():
            current = pools.setdefault(key, {})
        elif current is not None:
            value = value.strip()
            current[key] = int(value) if value.isdigit() else value
    return pools


def pool(subsystem: str, path: Path = POOLS_FILE) -> dict[str, object]:
    """The settings of one subsystem."""
    return load_pools(path)[subsystem]
