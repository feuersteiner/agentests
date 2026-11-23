"""Small helpers."""


def format_bytes(count):
    """A byte count for people: "512 B", "1.5 KiB", "2.0 MiB"."""
    if count >= 1024 * 1024:
        return f"{count / (1024 * 1024):.1f} MiB"
    if count >= 1024:
        return f"{count / 1024:.1f} KiB"
    return f"{count} B"
