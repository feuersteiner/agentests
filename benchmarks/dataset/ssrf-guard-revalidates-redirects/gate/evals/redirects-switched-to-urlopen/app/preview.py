"""Fetches the page behind a member's website for the preview card on their profile."""

import urllib.error
import urllib.request

from app import config, net
from app.html_meta import page_title


def fetch_site_title(url):
    """The title of the page at `url`, or None when there is no page to show.

    urlopen follows redirects, so sites that moved to https:// get a preview too.
    """
    if not net.is_public_url(url):
        return None
    request = urllib.request.Request(
        url, headers={"User-Agent": config.USER_AGENT, "Accept": "text/html"}
    )
    try:
        with urllib.request.urlopen(request, timeout=config.FETCH_TIMEOUT_S) as response:
            if response.status != 200:
                return None
            body = response.read(config.FETCH_MAX_BYTES)
    except (urllib.error.URLError, OSError):
        return None
    return page_title(body.decode("utf-8", "replace"))
