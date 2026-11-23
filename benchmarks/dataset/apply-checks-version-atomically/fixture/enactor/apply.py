"""Applying the newest plan to the endpoints."""

from enactor import dns, store


def apply_latest_plan() -> int | None:
    """Apply the newest plan to the endpoints. Returns its generation, or None when there is no plan."""
    raise NotImplementedError
