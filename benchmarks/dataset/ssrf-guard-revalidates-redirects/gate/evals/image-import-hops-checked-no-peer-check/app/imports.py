"""Downloads an image from a URL a member gives instead of uploading the file."""

import http.client
import urllib.parse

from app import config, net

MAX_REDIRECTS = 5


class ImportFailed(Exception):
    """The image could not be downloaded; the message says why."""


def download_image(url):
    """Return (content_type, data) for the image at `url`, following up to MAX_REDIRECTS redirects."""
    for _ in range(MAX_REDIRECTS + 1):
        if not net.is_public_url(url):
            raise ImportFailed("that address is not allowed")
        parts = urllib.parse.urlsplit(url)
        cls = http.client.HTTPSConnection if parts.scheme == "https" else http.client.HTTPConnection
        connection = cls(parts.hostname, parts.port, timeout=config.FETCH_TIMEOUT_S)
        target = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
        try:
            connection.request("GET", target, headers={"User-Agent": config.USER_AGENT})
            response = connection.getresponse()
            location = response.getheader("Location")
            if response.status in (301, 302, 303, 307, 308) and location:
                url = urllib.parse.urljoin(url, location)
                continue
            if response.status != 200:
                raise ImportFailed(f"the server answered {response.status}")
            content_type = (response.getheader("Content-Type") or "").split(";")[0].strip()
            return content_type, response.read(config.MAX_IMAGE_BYTES + 1)
        except (OSError, http.client.HTTPException) as exc:
            raise ImportFailed(f"could not reach {parts.hostname}") from exc
        finally:
            connection.close()
    raise ImportFailed("too many redirects")
