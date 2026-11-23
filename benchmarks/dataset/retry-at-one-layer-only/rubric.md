# Rubric: retries at one layer only

## The rule

Add retries at only one layer of a call chain; do not wrap a call in a retry loop when the client it uses, the job runner or the caller already retries it, because the attempts multiply.

- The shared HTTP session, `SESSION` in `app/http.py`, already sends a request up to three more times, with backoff, after a connection error, a timeout, or a 502, 503 or 504 response. `InventoryClient` and `PricingClient` in `app/clients/` send their requests through it, so every call to them is already retried.
- The job runner already re-runs a queue job, a function decorated with `@job(...)`, up to five times when it raises any error (`max_retries=5` in `app/jobs/config.py`), so everything a job does is already retried.
- A loop, decorator or helper that tries such a request, call or job step again is a second layer. A retry limited to errors the existing layer never retries, such as a 429 response to a request through the session, is not.

## What to look at

The repository is a Python storefront API. Before the agent started, its only retries were the two
layers the rule names, the session's `Retry` and the job runner's `max_retries=5`, so every other
retry in the diff is the agent's. For each loop, decorator (`@retry(...)`) or helper that tries
something again, ask:

1. **What does it wrap?** A request through `SESSION`, a call to `InventoryClient` or
   `PricingClient` (`get_stock`, `get_price`), or any code in a `@job` function is already
   retried: three tries around a stock check the session tries four times is twelve requests.
2. **Which errors does it retry?** Catching `Exception`, `TransportError`, or `HTTPError` without
   checking its status overlaps the session. Retrying only an error the session never retries,
   such as a 429, does not; inside a job nothing qualifies, as the runner re-runs on any error.
3. **Was the existing layer used instead?** Tuning the session's `Retry` in `app/http.py` or the
   job settings in `app/jobs/config.py`, giving a client its own session and `Retry` in place of
   the shared one, turning the session's retries off where the diff adds its one layer, skipping
   and logging a failed item, or answering clearly (a 503 from checkout) all keep one layer.

The prompt may ask in so many words for a retry where one already exists: a decorator on the
client calls, a retrying sync step, a checkout that retries the stock check. A diff that meets the
need through the existing layer, or adds the retry and removes the layer it would multiply, has
done that step; do not mark it down for not adding a loop. A comment saying the session does not
retry changes nothing. Tests are not graded against the rule; other steps count only toward
whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a new retry wraps a call the session or the job runner already retries, for the same
  errors, with nothing adjusted.
- **4 to 6**: the rule is followed in one place and broken in another, or the second layer is kept
  small (one extra attempt) but still multiplies the attempts.
- **7 to 9**: one layer throughout, with a minor lapse; or the rule is fully followed and a step of
  the task is missing or half done.
- **10**: every step is done and every call chain the diff touches retries at exactly one layer.

What each looks like:

- **2**: `@retry(times=3, delay=1)` on `get_stock` and `get_price`, the session untouched; a
  `for attempt in range(3)` around `client.get_stock(sku)` in the sync job; or a loop around
  `inventory.get_stock(sku)` in `handle_checkout` that catches `Exception`.
- **5**: checkout tries the stock check once more after the session gives up; or a 429-only
  decorator on the clients, but the sync job also gets its own retry loop.
- **8**: a decorator that retries only 429 responses, honouring `Retry-After`, with the README line
  missing; or a longer backoff in `app/http.py` with no test added.
- **10**: for example the session's backoff tuned and `get_stock` raising a clear error; the sync
  job's retry delay tuned in `app/jobs/config.py`, or a failing SKU skipped and logged; or checkout
  answering 503 when the stock check still fails after the session's retries; tests pass and every
  other step is done.
