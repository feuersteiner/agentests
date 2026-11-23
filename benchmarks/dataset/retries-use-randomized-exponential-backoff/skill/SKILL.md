---
name: retries-use-randomized-exponential-backoff
description: Use whenever you write or change Python service code under app/ that tries something again after it failed, for example retrying an HTTP or API call on a 5xx status or a network error, waiting for a database, cache or broker to come up at startup, reconnecting after a dropped connection, or resending a message, even if the request does not mention backoff, jitter or limits. Covers the wait between attempts (exponential, randomized and capped) and when to give up.
---

# Retries use randomized exponential backoff

## The rule

Every retry or reconnect loop waits with exponential backoff plus random jitter, caps the delay, and stops after a bounded number of attempts or total time, so many instances failing together do not retry in lockstep.

- A retry is code that tries an operation again after it failed: after an exception, an error status such as 503, or a lost connection. A reconnect is a retry of a connection. Either counts however it is written: a `for` or `while` loop, a recursive call or a retry helper. A loop that handles queue messages one after another, or polls until a job is done, is not a retry; a reconnect inside it is.
- Exponential backoff: the delay before each new attempt is a base delay multiplied by a constant factor for every failed attempt so far, for example `base * 2 ** attempt`. A fixed delay, or one that grows by a fixed step, is not exponential.
- Random jitter: every wait includes a random part drawn anew for each attempt, for example `random.uniform(0, delay)` or a random amount added to the delay, so processes that failed at the same moment wait different times.
- The cap is an explicit maximum that no single delay exceeds, for example `min(MAX_DELAY_S, base * 2 ** attempt)`. A limit on the number of attempts does not cap the delay.
- The bound is a maximum number of attempts, or a deadline on the time spent trying, after which the loop stops trying. A loop that tries until the operation succeeds, or until the process is stopped, has no bound. The count may start again after an attempt succeeds.

## Why

A retry loop that works on one machine misbehaves on a hundred. When a shared dependency fails,
every instance fails at the same moment; if they all wait the same fixed or doubling delay, they
all come back at the same moment too, and the recovering service is knocked over again. In June
2025 Google Cloud's Service Control tasks restarted together after a crash and hit the same
Spanner table at once. Their incident report names the missing piece, randomized exponential
backoff, and the region took hours to recover. Growth spreads attempts out over time, jitter
spreads instances apart, the cap keeps a long outage from producing hour-long sleeps, and the
bound turns a dependency that never comes back into an error someone sees, instead of a process
that hangs forever.

## How to apply it

For each retry or reconnect you add or touch:

1. Count attempts, or set a deadline with `time.monotonic()`; stop when it is reached and let the
   last error surface. "Until it is back" still gets a generous limit; a supervisor restarts the
   process.
2. Compute the delay as `min(MAX_DELAY_S, BASE_DELAY_S * 2 ** attempt)`.
3. Sleep a random fraction of it: `time.sleep(random.uniform(0, delay))`.
4. Name the base, cap and limit as constants in the settings, with their units.

Common slips: `while True` with `time.sleep(2)`; `time.sleep(2 ** attempt)`, which grows but has
no jitter and no cap; jitter and a cap inside a reconnect loop that never gives up.

## Example

Fetching exchange rates from a rates service that sometimes answers 429 or 5xx.

Violating: the same doubling delay on every instance, no cap, no limit.

```python
def fetch_rates(client):
    attempt = 0
    while True:
        response = client.get("/rates")
        if response.status < 500 and response.status != 429:
            return response
        time.sleep(2 ** attempt)
        attempt += 1
```

Compliant: capped exponential delay, full jitter, a fixed number of attempts.

```python
def fetch_rates(client):
    for attempt in range(RATES_MAX_ATTEMPTS):
        response = client.get("/rates")
        if response.status < 500 and response.status != 429:
            return response
        if attempt + 1 < RATES_MAX_ATTEMPTS:
            delay_s = min(RATES_MAX_DELAY_S, RATES_BASE_DELAY_S * 2 ** attempt)
            time.sleep(random.uniform(0, delay_s))
    raise RatesUnavailable(f"rates service answered {response.status} {RATES_MAX_ATTEMPTS} times")
```

## Before you commit

Read the staged diff once more. For each place that tries again after a failure, point to the
growth, the random part, the maximum delay and the limit on attempts or time. Fix anything missing
and check again before you commit.
