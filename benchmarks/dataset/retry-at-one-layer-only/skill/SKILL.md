---
name: retry-at-one-layer-only
description: Use whenever you add or change retry or backoff behaviour in Python service code - a retry loop, a retry decorator or helper, a call made "more resilient" to flaky or failing services, a job or endpoint that should try again - in HTTP clients (app/clients), queue jobs (app/jobs), endpoints (app/api) or the shared HTTP session (app/http.py), even if the request only says to retry, harden or stop something failing. Covers where in a call chain a retry may go, given the retries the shared session and the job runner already make.
---

# Retries at one layer only

## The rule

Add retries at only one layer of a call chain; do not wrap a call in a retry loop when the client it uses, the job runner or the caller already retries it, because the attempts multiply.

- The shared HTTP session, `SESSION` in `app/http.py`, already sends a request up to three more times, with backoff, after a connection error, a timeout, or a 502, 503 or 504 response. `InventoryClient` and `PricingClient` in `app/clients/` send their requests through it, so every call to them is already retried.
- The job runner already re-runs a queue job, a function decorated with `@job(...)`, up to five times when it raises any error (`max_retries=5` in `app/jobs/config.py`), so everything a job does is already retried.
- A loop, decorator or helper that tries such a request, call or job step again is a second layer. A retry limited to errors the existing layer never retries, such as a 429 response to a request through the session, is not.

## Why

Each retry loop looks harmless on its own, but the attempts at each layer multiply. Google's SRE
book describes a database brought down when three layers each retried three times, so one user
action could become 64 attempts against a service that was already struggling. A service that is
flaky because it is overloaded or restarting gets hit hardest exactly when it can least take it.

## How to apply it

1. Before adding a retry, find what already retries the call: the session in `app/http.py`, the
   job runner settings in `app/jobs/config.py`, and the code that calls yours.
2. If a layer already retries it, change that layer: tune its `Retry` (attempts, backoff, statuses)
   or the job settings, or give one client its own session with its own `Retry` in place of the
   shared one.
3. If the request asks for a retry somewhere else, move the retry rather than add one: turn the
   other layer off for that call, so there is still one.
4. Otherwise handle the failure without retrying: raise a clear error, answer 503, or skip and log
   the one item that failed and carry on.
5. A new retry is fine where nothing retries yet, or when it only retries errors the existing
   layer never retries, such as a 429; inside a job nothing qualifies.

Slips to watch for: `@retry(times=3)` on a client method that calls `self.session.get`; a
`for attempt in range(3)` around `client.get_stock(...)` in a job or endpoint; catching
`Exception` or every `HTTPError` "to be safe", which includes the errors the session already
retries.

## Example

A new endpoint that shows a product's price.

Violating: three tries here times four in the session is twelve requests per page view.

```python
def handle_price(sku: str) -> tuple[int, dict]:
    for attempt in range(3):
        try:
            return 200, {"price": PricingClient().get_price(sku)}
        except (HTTPError, TransportError):
            time.sleep(0.5 * 2 ** attempt)
    return 503, {"error": "pricing unavailable"}
```

Compliant: the session has already retried; the endpoint answers clearly when it still fails.

```python
def handle_price(sku: str) -> tuple[int, dict]:
    try:
        return 200, {"price": PricingClient().get_price(sku)}
    except (HTTPError, TransportError):
        return 503, {"error": "pricing unavailable"}
```

## Before you commit

List every retry in the staged diff (loops, decorators, helpers). For each, name the call it
wraps and every other layer that already retries that call. If there is one, remove or narrow the
new retry, or turn the other layer off, and check again.
