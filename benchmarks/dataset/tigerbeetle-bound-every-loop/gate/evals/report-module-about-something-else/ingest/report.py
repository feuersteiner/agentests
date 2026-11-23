"""Daily summary of what the worker stored."""

from collections import Counter

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def count_by_kind(events):
    """How many events there are of each kind, most common first."""
    counts = Counter(event.kind for event in events)
    return counts.most_common()


def format_summary(events):
    lines = ["kind            count"]
    for kind, count in count_by_kind(events):
        lines.append(f"{kind:<15} {count:>5}")
    return "\n".join(lines)


def week_header():
    return " ".join(WEEKDAYS[day] for day in range(7))
