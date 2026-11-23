"""Fetches pages that members link to, for previews."""

import http.client
import urllib.parse

from app import config, net
from app.html_meta import page_meta, page_title


def fetch_link_preview(url):
    """{"title", "image"} for the page at `url`, or None. A redirect means no preview."""
    parts = urllib.parse.urlsplit(url)
    if parts.scheme != "http" or not parts.hostname:
        return None
    try:
        addresses = net.resolve(parts.hostname)
    except OSError:
        return None
    if not addresses or not all(net.is_public_address(a) for a in addresses):
        return None
    # Connect to the address we checked, not to the name, which could resolve elsewhere now.
    connection = http.client.HTTPConnection(
        addresses[0], parts.port or 80, timeout=config.FETCH_TIMEOUT_S
    )
    target = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
    try:
        connection.request(
            "GET", target, headers={"Host": parts.netloc, "User-Agent": config.USER_AGENT}
        )
        response = connection.getresponse()
        if response.status != 200:
            return None
        html = response.read(config.FETCH_MAX_BYTES).decode("utf-8", "replace")
    except (OSError, http.client.HTTPException):
        return None
    finally:
        connection.close()
    image = page_meta(html).get("og:image")
    return {"title": page_title(html), "image": urllib.parse.urljoin(url, image) if image else None}
