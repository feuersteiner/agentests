# Elapsed time uses a monotonic clock

The Python files under `resolver/` are the edge resolver: its upstream selection and round-trip
times, its rate limiter, its circuit breaker and its query log. Wherever they work out a length of
time or use one:

Durations, timeouts and rates must be computed from a monotonic clock (time.monotonic, performance.now, process.hrtime, Go's monotonic reading), never by subtracting wall-clock timestamps, and code that must use wall time cannot assume the difference is non-negative.

- A duration is any length of time the code works out from clock readings: how long a query took, a round-trip time, the time since an event, whether a timeout, cooldown or retry time has passed, how far a rate limit has refilled. In Python, both readings come from `time.monotonic()`, `time.monotonic_ns()` or `time.perf_counter()`.
- `time.time()`, `time.time_ns()`, `datetime.now()` and `datetime.utcnow()` read the wall clock, which jumps when NTP corrects it or a leap second is inserted. It is for timestamps that people or other systems read, such as the time in a log line or a stored record, and for comparing with a timestamp from outside the process, such as one read from a file. Code that subtracts wall-clock times clamps or checks the result instead of assuming it is zero or more.
- A measured time, or a value derived from one, used as a divisor, as a weight or as the bound of a random choice, such as `1 / rtt`, is guarded so that zero or a negative value cannot reach it, for example with `max(rtt, MIN_RTT_S)` or a check that it is above zero. `if rtt:` stops zero but not a negative value. Even a monotonic clock can measure zero.

Code that reads no clock and uses no measured time is not affected. Tests and fakes under `tests/`
are not covered.
