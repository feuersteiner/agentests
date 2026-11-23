import json
from pathlib import Path

EVENTS = Path(__file__).parent / "fixtures" / "events"


def load_event(name: str) -> dict:
    """The sample event `tests/fixtures/events/<name>.json`."""
    return json.loads((EVENTS / f"{name}.json").read_text())
