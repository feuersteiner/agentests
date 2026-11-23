"""Fetches the page behind a member's website for the preview card on their profile."""

import urllib.error
import urllib.parse
import urllib.request

from app import config, net
from app.html_meta import page_title

MAX_REDIRECTS = 5


class _KeepRedirects(urllib.request.HTTPRedirectHandler):
    """Hands a 3xx back to the caller as an HTTPError instead of following it."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_opener = urllib.request.build_opener(_KeepRedirects)


def fetch_site_title(url):
    """The title of the page at `url`, or None when there is no page to show."""
    for _ in range(MAX_REDIRECTS + 1):
        if not net.is_public_url(url):
            return None
        request = urllib.request.Request(
            url, headers={"User-Agent": config.USER_AGENT, "Accept": "text/html"}
        )
        try:
            with _opener.open(request, timeout=config.FETCH_TIMEOUT_S) as response:
                body = response.read(config.FETCH_MAX_BYTES)
                return page_title(body.decode("utf-8", "replace"))
        except urllib.error.HTTPError as redirect:
            location = redirect.headers.get("Location")
            if redirect.code in (301, 302, 303, 307, 308) and location:
                url = urllib.parse.urljoin(url, location)
                continue
            return None
        except (urllib.error.URLError, OSError):
            return None
    return None
