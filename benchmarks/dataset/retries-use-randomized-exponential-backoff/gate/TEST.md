# Retries use randomized exponential backoff

The Python files under `app/` are the service: its database connection, its API clients, its
queue consumer and its webhook sender. When they try something again after it failed:

Every retry or reconnect loop waits with exponential backoff plus random jitter, caps the delay, and stops after a bounded number of attempts or total time, so many instances failing together do not retry in lockstep.

- A retry is code that tries an operation again after it failed: after an exception, an error status such as 503, or a lost connection. A reconnect is a retry of a connection. Either counts however it is written: a `for` or `while` loop, a recursive call or a retry helper. A loop that handles queue messages one after another, or polls until a job is done, is not a retry; a reconnect inside it is.
- Exponential backoff: the delay before each new attempt is a base delay multiplied by a constant factor for every failed attempt so far, for example `base * 2 ** attempt`. A fixed delay, or one that grows by a fixed step, is not exponential.
- Random jitter: every wait includes a random part drawn anew for each attempt, for example `random.uniform(0, delay)` or a random amount added to the delay, so processes that failed at the same moment wait different times.
- The cap is an explicit maximum that no single delay exceeds, for example `min(MAX_DELAY_S, base * 2 ** attempt)`. A limit on the number of attempts does not cap the delay.
- The bound is a maximum number of attempts, or a deadline on the time spent trying, after which the loop stops trying. A loop that tries until the operation succeeds, or until the process is stopped, has no bound. The count may start again after an attempt succeeds.

Code that never tries a failed operation again is not affected. Tests and fakes under `tests/`
are not covered.
