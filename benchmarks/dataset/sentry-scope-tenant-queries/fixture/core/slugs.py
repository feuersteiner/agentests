"""Slugs for URLs."""

import re


def slugify(name: str) -> str:
    """Lower-case `name` and replace everything but letters and digits with hyphens."""
    return re.sub(r"[^a-z0-9]", "-", name.lower())
