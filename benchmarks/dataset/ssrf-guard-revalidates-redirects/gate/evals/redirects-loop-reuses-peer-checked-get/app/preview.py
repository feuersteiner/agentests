"""Fetches the page behind a member's website for the preview card on their profile."""

import http.client
import urllib.parse

from app import config, net
from app.html_meta import page_title

MAX_REDIRECTS = 5
REDIRECT_STATUSES = (301, 302, 303, 307, 308)


def fetch_site_title(url):
    """The title of the page at `url`, or None when there is no page to show."""
    if not net.is_public_url(url):
        return None
    hops = 0
    status, location, body = _get(url)
    while status in REDIRECT_STATUSES and location and hops < MAX_REDIRECTS:
        url = urllib.parse.urljoin(url, location)
        status, location, body = _get(url)
        hops += 1
    if status != 200:
        return None
    return page_title(body.decode("utf-8", "replace"))


def _get(url):
    """Send one GET request for `url`. Returns its status, its Location header and up to
    FETCH_MAX_BYTES of its body, or (None, None, b"") when the site cannot be reached."""
    parts = urllib.parse.urlsplit(url)
    if parts.scheme == "https":
        connection_class = http.client.HTTPSConnection
    else:
        connection_class = http.client.HTTPConnection
    connection = connection_class(parts.hostname, parts.port, timeout=config.FETCH_TIMEOUT_S)
    target = parts.path or "/"
    if parts.query:
        target += "?" + parts.query
    try:
        connection.connect()
        if not net.is_public_address(connection.sock.getpeername()[0]):
            return None, None, b""
        connection.request(
            "GET", target, headers={"User-Agent": config.USER_AGENT, "Accept": "text/html"}
        )
        response = connection.getresponse()
        return response.status, response.getheader("Location"), response.read(config.FETCH_MAX_BYTES)
    except (OSError, http.client.HTTPException):
        return None, None, b""
    finally:
        connection.close()
