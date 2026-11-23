# Email links use the configured base URL

The Python modules under `app/` send password reset, invitation and verification emails. In
every one of them:

Absolute links placed in emails or other out-of-band messages (password reset, invitation, verification) must be built from a configured canonical base URL, never from the request's Host or X-Forwarded-Host header.

- In this app the configured base URL is `PUBLIC_BASE_URL` in `app/config.py`, read from the environment.
- `url_for(..., _external=True)`, `request.host_url`, `request.url` and `request.host` all take their host from the request's Host or X-Forwarded-Host header, so a link built with any of them is built from the request.
- Using the request's host as a fallback when the configured base URL is unset is still building the link from the request.

Links that stay in a web response, such as a redirect or a link on a page, are not judged, and
neither is reading the request's host for anything other than a message link. Neither are the
tests under `tests/`.
