---
name: email-links-use-configured-base-url
description: Use whenever you write or change Python code under app/ that sends an email or other message containing a link (password reset, account or email verification, team invitation, magic sign-in link, notification or digest email), for example in app/auth.py, app/teams.py, app/admin.py or app/mail.py, or that changes how the app's public address is set per environment (app/config.py, deploy/*.env). Covers building absolute links for messages from the configured PUBLIC_BASE_URL instead of the incoming request's host.
---

# Email links use the configured base URL

## The rule

Absolute links placed in emails or other out-of-band messages (password reset, invitation, verification) must be built from a configured canonical base URL, never from the request's Host or X-Forwarded-Host header.

- In this app the configured base URL is `PUBLIC_BASE_URL` in `app/config.py`, read from the environment.
- `url_for(..., _external=True)`, `request.host_url`, `request.url` and `request.host` all take their host from the request's Host or X-Forwarded-Host header, so a link built with any of them is built from the request.
- Using the request's host as a fallback when the configured base URL is unset is still building the link from the request.

## Why

Anyone can send a request with any Host or X-Forwarded-Host header. An attacker asks for a
password reset for someone else's account with `Host: evil.example`; the victim gets a genuine
email from us whose link points at the attacker's domain and carries a valid token, and one
click hands the token over. The IRRd routing registry shipped exactly this
(GHSA-22m3-c7vp-49fj): its account creation and reset emails took their links from the HTTP
request. Tests never notice, because the test client always sends a friendly host.

## How to apply it

- Build the path with `url_for(...)` (no `_external`) and put `config.PUBLIC_BASE_URL` in front.
- If a link is wrong in one environment, fix that environment's configuration (`deploy/*.env`,
  or `app/config.py`), not the code that builds the link.
- If `PUBLIC_BASE_URL` might be missing, fail loudly (at start-up or when sending), never fall
  back to the request.

Common slips:

- `url_for(..., _external=True)` in a view: it looks like configuration but uses the request.
- `request.host_url` or `request.url` to make a link "work in every environment".
- `config.PUBLIC_BASE_URL or request.host_url`, or a `base_url(request)` helper that does the same.
- Reading `X-Forwarded-Host` because the app sits behind a load balancer.

Reading the request's host for something that is not a message link, such as a log line, is fine.

## Example

Emailing a rota manager when a shift export is ready.

Violating: the link takes its host from whoever made the request.

```python
link = url_for("exports.download", export_id=export.id, _external=True)
send_mail(manager.email, "Your rota export is ready", f"Download it here:\n\n{link}\n")
```

Compliant: the host comes from the configured base URL.

```python
link = config.PUBLIC_BASE_URL + url_for("exports.download", export_id=export.id)
send_mail(manager.email, "Your rota export is ready", f"Download it here:\n\n{link}\n")
```

## Before you commit

For every link in the staged diff that ends up in an email or another message, trace where its
scheme and host come from, through any helper. Confirm it is `PUBLIC_BASE_URL` (or another
configured value) with no fallback to the request, and that no `_external=True`, `host_url`,
`request.url`, `request.host` or Host header feeds it. Fix what fails and check again.
