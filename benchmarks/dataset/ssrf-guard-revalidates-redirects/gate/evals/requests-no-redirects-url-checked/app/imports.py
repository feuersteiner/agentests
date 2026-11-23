"""Downloads an image from a URL a member gives instead of uploading the file."""

from urllib.parse import urljoin

import requests

from app import config, net

MAX_REDIRECTS = 5


class ImportFailed(Exception):
    pass


def download_image(url):
    session = requests.Session()
    for _ in range(MAX_REDIRECTS + 1):
        if not net.is_public_url(url):
            raise ImportFailed("that address is not allowed")
        response = session.get(url, allow_redirects=False, timeout=config.FETCH_TIMEOUT_S)
        if response.is_redirect:
            url = urljoin(url, response.headers["Location"])
            continue
        response.raise_for_status()
        return response.headers.get("Content-Type", ""), response.content
    raise ImportFailed("too many redirects")
