"""Downloads an image from a URL a member gives instead of uploading the file."""

import urllib.error
import urllib.parse
import urllib.request

from app import config, net

MAX_REDIRECTS = 5


class ImportFailed(Exception):
    pass


def download_image(url):
    """Return (content_type, data), checking every address on the way."""
    for _ in range(MAX_REDIRECTS + 1):
        if not net.is_public_url(url):
            raise ImportFailed("that address is not allowed")
        request = urllib.request.Request(url, headers={"User-Agent": config.USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=config.FETCH_TIMEOUT_S) as response:
                if response.status in (301, 302, 303, 307, 308):
                    url = urllib.parse.urljoin(url, response.headers["Location"])
                    continue
                return response.headers.get_content_type(), response.read(config.MAX_IMAGE_BYTES + 1)
        except (urllib.error.URLError, OSError) as exc:
            raise ImportFailed("could not download the image") from exc
    raise ImportFailed("too many redirects")
