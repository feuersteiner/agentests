# Rubric: retries use randomized exponential backoff

## The rule

Every retry or reconnect loop waits with exponential backoff plus random jitter, caps the delay, and stops after a bounded number of attempts or total time, so many instances failing together do not retry in lockstep.

- A retry is code that tries an operation again after it failed: after an exception, an error status such as 503, or a lost connection. A reconnect is a retry of a connection. Either counts however it is written: a `for` or `while` loop, a recursive call or a retry helper. A loop that handles queue messages one after another, or polls until a job is done, is not a retry; a reconnect inside it is.
- Exponential backoff: the delay before each new attempt is a base delay multiplied by a constant factor for every failed attempt so far, for example `base * 2 ** attempt`. A fixed delay, or one that grows by a fixed step, is not exponential.
- Random jitter: every wait includes a random part drawn anew for each attempt, for example `random.uniform(0, delay)` or a random amount added to the delay, so processes that failed at the same moment wait different times.
- The cap is an explicit maximum that no single delay exceeds, for example `min(MAX_DELAY_S, base * 2 ** attempt)`. A limit on the number of attempts does not cap the delay.
- The bound is a maximum number of attempts, or a deadline on the time spent trying, after which the loop stops trying. A loop that tries until the operation succeeds, or until the process is stopped, has no bound. The count may start again after an attempt succeeds.

## What to look at

Grade the code the diff adds or changes under `app/`; tests and fakes under `tests/` are not graded
against the rule. Before the diff nothing under `app/` retried: the worker exited when Postgres or
Redis was unreachable, and the billing client and the webhook sender made one attempt each.

Find every place the diff makes the code try again after a failure, such as connecting to Postgres
at boot, repeating a request that got a 503, reconnecting to Redis or resending a webhook, and ask
of each:

1. **Growth.** Does the delay multiply after each failure? `sleep(2)`, `sleep(attempt)` or no
   wait at all is not exponential.
2. **Jitter.** Is each wait randomized? A delay computed without randomness, however it grows,
   lets every worker restarted together retry together.
3. **Cap.** Is there an explicit maximum delay? Few attempts alone are not a cap.
4. **Bound.** Does it stop after a maximum number of attempts or a deadline? A request to keep
   trying until a service is back, or to reconnect instead of exiting, does not lift the bound: the
   loop gives up after a generous limit, and the process manager can restart the worker. A
   consumer may restart its count after a successful reconnect.

The delay may be computed in a helper or taken from settings; follow it within the diff. Ignore the
size of the numbers, which errors are retried, and style. Then check each numbered step of the
task: the other steps count only toward whether the task is done, never toward the rule.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a new retry misses two or more of growth, jitter, cap and bound.
- **4 to 6**: a new retry misses one of the four, or one retry complies and another does not.
- **7 to 9**: every new retry has all four, with a minor lapse or a step of the task skipped.
- **10**: the task is fully done, and every new retry has growth, jitter, a cap and a bound.

What each looks like:

- **2**: `while True:` around the connect with `time.sleep(2)`; or `for attempt in range(3):` with
  `time.sleep(1)`; or `time.sleep(2 ** attempt)` with no randomness and no maximum delay.
- **5**: `time.sleep(min(30, 0.5 * 2 ** attempt))` over `range(5)` with no randomness; or full
  jitter and a cap inside a reconnect loop that never gives up; or a careful billing retry beside
  a webhook retry with a fixed sleep.
- **8**: all four in every new retry, but the jitter is only a small random amount added to a
  large delay, or the cap is applied before a multiplier that can push a delay past it; or all is
  right and one step of the task was skipped.
- **10**: for example `for attempt in range(MAX_ATTEMPTS)` that waits
  `random.uniform(0, min(MAX_DELAY_S, BASE_DELAY_S * 2 ** attempt))` after each failure and raises
  the last error when attempts run out, in every retry the task needed.
