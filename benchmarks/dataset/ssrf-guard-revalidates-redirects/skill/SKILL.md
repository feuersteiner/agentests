---
name: ssrf-guard-revalidates-redirects
description: Use whenever you write or change Python service code under app/ that makes the server send an HTTP request to a URL that came from a user, for example unfurling or previewing links, importing a file or image from a URL, delivering webhooks or callbacks, fetching a feed or a member's website, or changing how such a fetch handles redirects, even if the request does not mention security. Covers checking the destination against private, loopback, link-local and metadata addresses on every redirect hop and on the address actually connected to.
---

# The SSRF guard covers every redirect hop

## The rule

When the server fetches a URL supplied by a user, the destination check (no private, loopback, link-local or metadata addresses) must apply to every redirect hop and to the address actually connected to, so redirects are disabled or followed manually with re-validation.

- A URL supplied by a user is any URL that is not fixed in the code or the settings: a posted link, a profile website, an image or webhook URL, a link found in a fetched page, and the `Location` of a redirect from any of these.
- The destination check is `is_public_url(url)` in `app/net.py`, which accepts only an http or https URL whose host resolves to public addresses only; `is_public_address(address)` in the same file checks one address.
- `urllib.request.urlopen`, an opener built with urllib's default handlers, and `requests` without `allow_redirects=False` follow redirects by themselves, for POST requests too, and never call the check; `http.client` never follows them. A fetch either treats a redirect as a failure, or follows it in its own loop that checks every hop before sending its request and stops after a fixed number of hops.
- The address actually connected to is checked when the code checks the connected socket's peer address with `is_public_address` before sending the request, or connects only to an address it resolved and checked. Checking the URL and then letting the connection look the host up again leaves a gap.

## Why

Bolt CMS checked every submitted URL with a URL safety checker before fetching it, and still had
a server-side request forgery hole (GHSA-3xjf-9q55-vxw4): its HTTP client followed redirects, so
a user could submit a public URL that answered `302 Location: http://169.254.169.254/...` and
make the server read cloud metadata or internal services. The check looked right in review; the
gap was in the client's default redirect behaviour. The same goes for DNS: a host can resolve to
a public address when it is checked and to a private one a moment later when the connection is
made, so the address that matters is the one actually connected to.

## How to apply it

For each request the server sends to a user's URL:

1. Check the URL with `is_public_url` right before sending, in the function that sends it.
2. Send it with something that does not follow redirects (`http.client`, or an opener whose
   redirect handler refuses them).
3. To follow redirects, loop over a fixed number of hops: resolve `Location` against the current
   URL with `urllib.parse.urljoin`, check the new URL, then request it.
4. After connecting and before sending, check the socket's peer address with `is_public_address`.

Common slips: `if not is_public_url(url): ...` followed by `urlopen(url)`; a hand-written redirect
loop that checks only the first URL; `while True` around the redirects; checking a webhook URL
once at registration and posting to it later unchecked.

## Example

Refreshing a member's calendar feed from the URL they saved.

Violating: the first URL is checked, then `urlopen` follows any redirect, internal ones included.

```python
def fetch_feed(url):
    if not net.is_public_url(url):
        raise BlockedURL(url)
    with urllib.request.urlopen(url, timeout=5) as response:
        return response.read()
```

Compliant: every hop is checked, the connected address too, and the hops are limited.

```python
def fetch_feed(url):
    for _ in range(MAX_REDIRECTS + 1):
        if not net.is_public_url(url):
            raise BlockedURL(url)
        parts = urllib.parse.urlsplit(url)
        cls = http.client.HTTPSConnection if parts.scheme == "https" else http.client.HTTPConnection
        conn = cls(parts.hostname, parts.port, timeout=5)
        try:
            conn.connect()
            if not net.is_public_address(conn.sock.getpeername()[0]):
                raise BlockedURL(url)
            conn.request("GET", (parts.path or "/") + (f"?{parts.query}" if parts.query else ""))
            response = conn.getresponse()
            if response.status in (301, 302, 303, 307, 308) and response.getheader("Location"):
                url = urllib.parse.urljoin(url, response.getheader("Location"))
                continue
            return response.read()
        finally:
            conn.close()
    raise BlockedURL(f"more than {MAX_REDIRECTS} redirects")
```

## Before you commit

Read the staged diff once more. For every request to a user's URL, point to the check before the
first request, the check on every redirect hop, the hop limit and the peer-address check. Fix
anything missing and check again before you commit.
