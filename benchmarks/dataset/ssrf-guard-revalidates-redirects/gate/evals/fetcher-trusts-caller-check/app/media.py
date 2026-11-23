"""Downloads remote media for imports. Callers check the URL with net.is_public_url first."""

import http.client
import urllib.parse

from app import config


def download(url):
    """GET `url` once; returns (status, content type, body). Redirects are not followed."""
    parts = urllib.parse.urlsplit(url)
    cls = http.client.HTTPSConnection if parts.scheme == "https" else http.client.HTTPConnection
    connection = cls(parts.hostname, parts.port, timeout=config.FETCH_TIMEOUT_S)
    target = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
    try:
        connection.request("GET", target, headers={"User-Agent": config.USER_AGENT})
        response = connection.getresponse()
        content_type = response.getheader("Content-Type") or ""
        return response.status, content_type, response.read(config.MAX_IMAGE_BYTES + 1)
    finally:
        connection.close()
