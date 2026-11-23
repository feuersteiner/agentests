# Rubric: elapsed time uses a monotonic clock

## The rule

Durations, timeouts and rates must be computed from a monotonic clock (time.monotonic, performance.now, process.hrtime, Go's monotonic reading), never by subtracting wall-clock timestamps, and code that must use wall time cannot assume the difference is non-negative.

- A duration is any length of time the code works out from clock readings: how long a query took, a round-trip time, the time since an event, whether a timeout, cooldown or retry time has passed, how far a rate limit has refilled. In Python, both readings come from `time.monotonic()`, `time.monotonic_ns()` or `time.perf_counter()`.
- `time.time()`, `time.time_ns()`, `datetime.now()` and `datetime.utcnow()` read the wall clock, which jumps when NTP corrects it or a leap second is inserted. It is for timestamps that people or other systems read, such as the time in a log line or a stored record, and for comparing with a timestamp from outside the process, such as one read from a file. Code that subtracts wall-clock times clamps or checks the result instead of assuming it is zero or more.
- A measured time, or a value derived from one, used as a divisor, as a weight or as the bound of a random choice, such as `1 / rtt`, is guarded so that zero or a negative value cannot reach it, for example with `max(rtt, MIN_RTT_S)` or a check that it is above zero. `if rtt:` stops zero but not a negative value. Even a monotonic clock can measure zero.

## What to look at

Grade the code the diff adds or changes under `resolver/`; tests and fakes under `tests/` are not
graded against the rule. Before the diff, only the query log read a clock, to stamp each line
with `datetime.now(timezone.utc)`, which is allowed; the rate limiter and breaker were stubs.

Find every clock reading the diff adds and ask what it is for:

1. **Durations.** Timing a query, keeping a smoothed RTT, refilling a token bucket, deciding that
   a breaker's 30 seconds have passed: each must read `time.monotonic()`, `time.monotonic_ns()` or
   `time.perf_counter()` at both ends. Storing `time.time()` to subtract later, or a deadline such
   as `time.time() + 30`, breaks the rule. An injected clock is judged by its default and by what
   the diff passes; a test that patches `time.time` to drive the code shows it reads the wall clock.
2. **Wall time.** A wall-clock reading used only as a timestamp is fine. A subtraction of
   wall-clock times that the task really needs must clamp or check a negative result.
3. **Guards.** Where a measured time feeds a division, a weight or a random choice, as weighting
   upstreams by 1/RTT does, the code must stop a value of zero or below explicitly, for example
   `1 / max(srtt, MIN_RTT_S)`, a floor applied when the RTT is stored, or a `> 0` check. A value
   that is merely expected to stay positive is not guarded. An unmeasured upstream (`srtt_s` is
   `None`) needs a starting value above zero.

Ignore the smoothing factor, numbers and style. Then check each step of the task: the other steps
count only toward whether the task is done, never toward the rule.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a new duration is computed from the wall clock, and nothing guards its result.
- **4 to 6**: monotonic in some places and wall clock in others; wall clock everywhere, but every
  difference is clamped or checked; or monotonic everywhere, but a weight or divisor taken from a
  measured time has no explicit guard, or only `if rtt:`.
- **7 to 9**: every new duration is monotonic and every weight or divisor is guarded, with a minor
  lapse or a step of the task skipped.
- **10**: the task is fully done, every duration is monotonic and every weight or divisor guarded.

What each looks like:

- **2**: `start = time.time()` before the upstream query and `rtt = time.time() - start` after it;
  a breaker that stores `opened_at = time.time()` and reopens when `time.time() - opened_at >= 30`;
  a token bucket that refills by `(time.time() - last) * rate`; `random.choices(..., weights=[1 /
  u.srtt_s ...])` with RTTs measured on the wall clock.
- **5**: RTT measured with `time.monotonic()` but the breaker's reopen time on `time.time()`; or
  `elapsed = max(0.0, time.time() - start)` everywhere; or monotonic RTTs weighted by `1 / srtt`
  with no guard.
- **8**: monotonic and guarded everywhere, but a step of the task is skipped or half done, for
  example no test, or the RTT missing from `stats()`.
- **10**: for example `start = time.monotonic()` and `rtt_s = time.monotonic() - start` around the
  upstream query, weights of `1 / max(srtt_s, MIN_RTT_S)` with a positive starting RTT, a breaker
  that records `time.monotonic()` when it opens, and a bucket refilled from monotonic readings.
