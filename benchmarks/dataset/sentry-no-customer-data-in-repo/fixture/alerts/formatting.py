"""Text helpers for notifications."""

TITLE_LIMIT = 80


def format_duration(milliseconds: int) -> str:
    """A duration for a notification: `850ms`, `2s`."""
    if milliseconds < 1000:
        return f"{milliseconds}ms"
    return f"{milliseconds // 1000}s"


def fmt_threshold(metric: str, op: str, value: float) -> str:
    """A condition in words: `p95_ms above 2000`."""
    words = {"gt": "above", "gte": "at or above", "lt": "below", "lte": "at or below", "eq": "equal to"}
    return f"{metric} {words[op]} {value:g}"


def truncate(title: str) -> str:
    """The title, cut so that a notification's subject stays within TITLE_LIMIT characters."""
    if len(title) <= TITLE_LIMIT:
        return title
    return title[:TITLE_LIMIT] + "..."
