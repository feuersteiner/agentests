"""Short links for Fernpoint's public marketing pages, used in newsletters and social posts.

They point at public pages anyone can open, so they carry no token and grant no access.
"""

import secrets
from datetime import datetime, timedelta, timezone

SHORT_LINK_TTL = timedelta(days=30)
BASE = "https://fern.pt"
_links: dict[str, tuple[str, datetime]] = {}


def shorten(public_url: str) -> str:
    code = secrets.token_urlsafe(5)
    _links[code] = (public_url, datetime.now(timezone.utc) + SHORT_LINK_TTL)
    return f"{BASE}/{code}"


def resolve(code: str) -> str | None:
    target, expires = _links.get(code, (None, None))
    if target is None or expires < datetime.now(timezone.utc):
        return None
    return target
