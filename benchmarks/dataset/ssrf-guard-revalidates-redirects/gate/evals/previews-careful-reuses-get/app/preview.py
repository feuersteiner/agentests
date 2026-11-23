"""Fetches pages that members link to: the website on their profile and the links in their posts."""

import http.client
import urllib.parse
from dataclasses import dataclass

from app import config, net
from app.html_meta import page_meta, page_title


@dataclass
class LinkPreview:
    title: str | None
    image: str | None


def fetch_site_title(url):
    """The title of the page at `url`, or None when there is no page to show."""
    html = _fetch_html(url)
    return page_title(html) if html is not None else None


def fetch_link_preview(url):
    """The title and og:image of the page a post links to, or None when there is no page."""
    html = _fetch_html(url)
    if html is None:
        return None
    image = page_meta(html).get("og:image")
    if image:
        image = urllib.parse.urljoin(url, image)
    return LinkPreview(title=page_title(html), image=image)


def _fetch_html(url):
    if not net.is_public_url(url):
        return None
    status, body = _get(url)
    if status != 200:
        return None
    return body.decode("utf-8", "replace")


def _get(url):
    """Send one GET request for `url`. Returns its status and up to FETCH_MAX_BYTES of its body,
    or (None, b"") when the site cannot be reached."""
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
            return None, b""
        connection.request(
            "GET", target, headers={"User-Agent": config.USER_AGENT, "Accept": "text/html"}
        )
        response = connection.getresponse()
        return response.status, response.read(config.FETCH_MAX_BYTES)
    except (OSError, http.client.HTTPException):
        return None, b""
    finally:
        connection.close()
