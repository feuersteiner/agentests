---
name: elapsed-time-uses-monotonic-clock
description: Use whenever you write or change Python service code that measures or tracks time, for example timing a request or query, keeping latency or round-trip averages, timeouts and deadlines, cooldowns, retry or reopen timers, rate limiters and token buckets, throughput rates, or choosing or weighting by a measured time, even if the request does not mention clocks. Covers which clock to read and how to guard values computed from measured times.
---

# Elapsed time uses a monotonic clock

## The rule

Durations, timeouts and rates must be computed from a monotonic clock (time.monotonic, performance.now, process.hrtime, Go's monotonic reading), never by subtracting wall-clock timestamps, and code that must use wall time cannot assume the difference is non-negative.

- A duration is any length of time the code works out from clock readings: how long a query took, a round-trip time, the time since an event, whether a timeout, cooldown or retry time has passed, how far a rate limit has refilled. In Python, both readings come from `time.monotonic()`, `time.monotonic_ns()` or `time.perf_counter()`.
- `time.time()`, `time.time_ns()`, `datetime.now()` and `datetime.utcnow()` read the wall clock, which jumps when NTP corrects it or a leap second is inserted. It is for timestamps that people or other systems read, such as the time in a log line or a stored record, and for comparing with a timestamp from outside the process, such as one read from a file. Code that subtracts wall-clock times clamps or checks the result instead of assuming it is zero or more.
- A measured time, or a value derived from one, used as a divisor, as a weight or as the bound of a random choice, such as `1 / rtt`, is guarded so that zero or a negative value cannot reach it, for example with `max(rtt, MIN_RTT_S)` or a check that it is above zero. `if rtt:` stops zero but not a negative value. Even a monotonic clock can measure zero.

## Why

The wall clock is not a stopwatch. NTP steps it backwards and forwards, and a leap second repeats
a second. At the leap second of 1 January 2017, Cloudflare's DNS resolver subtracted two wall-clock
readings to time an upstream query and got a negative round-trip time. The smoothed value went
negative and was passed to a random-number function that panics when given zero or less, and some
lookups failed until the code was patched. Their write-up names the lesson: some code assumed that
the difference between two times would always be, at worst, zero. Tests never catch this, because
the clock only jumps in production.

## How to apply it

- Before writing `time.time()` or `datetime.now()`, ask whether the value is a timestamp someone
  will read, or one end of a length of time. Only the first may use the wall clock.
- Store monotonic readings for "when did this start" (`self.opened_at = time.monotonic()`) and
  compare monotonic readings for "has it been long enough".
- Wherever a measured time ends up under a division or in a weight, put a floor at the point of
  use: `1 / max(elapsed_s, MIN_ELAPSED_S)`.
- To test timing code, inject the clock (`clock=time.monotonic`) and pass a fake in the test.

Common slips: `start = time.time(); ...; time.time() - start`; a deadline of `time.time() + 30`;
`datetime.now() - self.last_refill`; `1 / rtt` straight from a measurement.

## Example

Reporting how many jobs per second a worker handled since its last report.

Violating: wall-clock difference, and a division that a zero or negative interval breaks.

```python
def report(self):
    now = time.time()
    rate = self.jobs / (now - self.since)
    self.jobs, self.since = 0, now
    return rate
```

Compliant: monotonic readings, and the interval is floored where it is divided by.

```python
def report(self):
    now_s = time.monotonic()
    interval_s = max(now_s - self.since_s, MIN_INTERVAL_S)
    rate = self.jobs / interval_s
    self.jobs, self.since_s = 0, now_s
    return rate
```

## Before you commit

Read the staged diff once more. For every clock reading, say whether it is a timestamp or one end
of a duration; every duration must use a monotonic clock. For every division, weight or random
choice fed by a measured time, point to the guard. Fix anything missing and check again.
