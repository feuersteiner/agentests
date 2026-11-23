# Retries at one layer only

The Python files under `app/clients/`, `app/jobs/` and `app/api/` are the storefront's service
clients, queue jobs and endpoints. In them:

Add retries at only one layer of a call chain; do not wrap a call in a retry loop when the client it uses, the job runner or the caller already retries it, because the attempts multiply.

- The shared HTTP session, `SESSION` in `app/http.py`, already sends a request up to three more times, with backoff, after a connection error, a timeout, or a 502, 503 or 504 response. `InventoryClient` and `PricingClient` in `app/clients/` send their requests through it, so every call to them is already retried.
- The job runner already re-runs a queue job, a function decorated with `@job(...)`, up to five times when it raises any error (`max_retries=5` in `app/jobs/config.py`), so everything a job does is already retried.
- A loop, decorator or helper that tries such a request, call or job step again is a second layer. A retry limited to errors the existing layer never retries, such as a 429 response to a request through the session, is not.

A file that retries nothing has nothing to check. Settings of the existing layers, such as a
session's `Retry(...)` or the job settings, are not a second layer, and neither is a retry around
a request sent through a session that does not retry. Tests are not judged.
