"""Downloads an image from a URL a member gives instead of uploading the file."""

import http.client
import urllib.parse

from app import config, net

MAX_REDIRECTS = 5
REDIRECT_STATUSES = {301, 302, 303, 307, 308}


class ImportFailed(Exception):
    """The image could not be downloaded; the message says why."""


def download_image(url):
    """Return (content_type, data) for the image at `url`, following up to MAX_REDIRECTS redirects."""
    for _ in range(MAX_REDIRECTS + 1):
        if not net.is_public_url(url):
            raise ImportFailed("that address is not allowed")
        status, headers, body = _get(url)
        if status in REDIRECT_STATUSES and headers.get("location"):
            url = urllib.parse.urljoin(url, headers["location"])
            continue
        if status != 200:
            raise ImportFailed(f"the server answered {status}")
        return headers.get("content-type", "").split(";")[0].strip(), body
    raise ImportFailed("too many redirects")


def _get(url):
    """One GET request, sent only if the address we connected to is public. Redirects are returned,
    not followed."""
    parts = urllib.parse.urlsplit(url)
    cls = http.client.HTTPSConnection if parts.scheme == "https" else http.client.HTTPConnection
    connection = cls(parts.hostname, parts.port, timeout=config.FETCH_TIMEOUT_S)
    target = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
    try:
        connection.connect()
        if not net.is_public_address(connection.sock.getpeername()[0]):
            raise ImportFailed("that address is not allowed")
        connection.request("GET", target, headers={"User-Agent": config.USER_AGENT})
        response = connection.getresponse()
        headers = {name.lower(): value for name, value in response.getheaders()}
        body = response.read(config.MAX_IMAGE_BYTES + 1)
        if len(body) > config.MAX_IMAGE_BYTES:
            raise ImportFailed("the image is larger than 5 MB")
        return response.status, headers, body
    except (OSError, http.client.HTTPException) as exc:
        raise ImportFailed(f"could not reach {parts.hostname}") from exc
    finally:
        connection.close()
