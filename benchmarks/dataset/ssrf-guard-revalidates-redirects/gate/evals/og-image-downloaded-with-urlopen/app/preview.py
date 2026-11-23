"""Fetches pages that members link to: the website on their profile and the links in their posts."""

import http.client
import urllib.parse
import urllib.request
from dataclasses import dataclass

from app import config, net
from app.html_meta import page_meta, page_title


@dataclass
class LinkPreview:
    title: str | None
    image: bytes | None


def fetch_site_title(url):
    """The title of the page at `url`, or None when there is no page to show."""
    html = _fetch_html(url)
    return page_title(html) if html is not None else None


def fetch_link_preview(url):
    """The title and og:image of the page a post links to, or None when there is no page."""
    html = _fetch_html(url)
    if html is None:
        return None
    image_url = page_meta(html).get("og:image")
    image = _download_image(urllib.parse.urljoin(url, image_url)) if image_url else None
    return LinkPreview(title=page_title(html), image=image)


def _download_image(image_url):
    """The bytes of the og:image, kept with the preview so the board never hotlinks it."""
    try:
        with urllib.request.urlopen(image_url, timeout=config.FETCH_TIMEOUT_S) as response:
            return response.read(config.MAX_IMAGE_BYTES)
    except OSError:
        return None


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
