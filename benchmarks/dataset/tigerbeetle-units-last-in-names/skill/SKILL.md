---
name: tigerbeetle-units-last-in-names
description: Use whenever you add or change Python code in the uploader (uploader/*.py) that names a quantity, such as a duration, timeout, delay, deadline, clock reading, size in bytes, rate, count or limit, whether it is a Config setting, a module constant, a local variable, a parameter, an attribute or a dataclass field, even if the request says nothing about naming. Covers where the unit goes in the name and where qualifiers such as max, min, avg, total and initial go.
---

# Quantity names carry their unit, with qualifiers last

## The rule

Names of quantities carry their unit or qualifier, placed last in order of descending significance (for example `latency_ms_max`, `upload_timeout_s`), rather than bare names such as `timeout` or prefix forms such as `max_latency_ms`.

- A quantity is a length of time, a deadline or clock reading, an amount of data, a rate or a count. The rule covers every name the code defines for one, or for a list of them: variables, constants, parameters, attributes and fields. Indexes, identifiers, codes, flags, text and raw data are not quantities, and a name a library defines, such as the `timeout` keyword of `urlopen`, is not the code's own.
- A unit is a short suffix such as `_ms`, `_s`, `_bytes` or `_per_s`, and a count's unit is the thing counted (`chunks`, `retries_max`). A ratio or multiplier needs no unit. A unit given only in a comment is not in the name.
- A name starts with what is measured, then the unit, then any qualifier such as `max`, `min`, `avg`, `total` or `initial`: `retry_delay_ms_max`, not `max_retry_delay_ms` or `retry_delay_max_ms`.

## Why

A bare `timeout = 120` makes every reader guess: seconds or milliseconds? The guess is wrong often
enough to ship a 120 ms timeout or a two-minute sleep. With the unit in the name, a conversion bug
shows on the line itself: `deadline_s = now_s + timeout_ms` reads wrong. Putting the qualifier
last keeps related names together and lined up, so `delay_ms_initial`, `delay_ms_max` and
`delay_ms_min` sort next to each other and the eye compares them at a glance.

## How to apply it

For every name you add or rename that holds a number with a meaning:

1. Write what is measured first: `upload_timeout`, `chunk_duration`, `file`.
2. Add the unit: `_s`, `_ms`, `_ns` for time and clock readings, `_bytes` for sizes, `_per_s` for
   rates. For a count, the thing counted is the unit: `chunks`, `files_failed`.
3. Add the qualifier, if any, at the very end: `_max`, `_min`, `_avg`, `_total`, `_initial`.
   Words that mean a qualifier count too: "slowest" is `_max`, "average" is `_avg`.
4. Match the names already in the file and in `Config`, and convert at the edge: if a library
   wants seconds and you hold milliseconds, write `sleep(delay_ms / 1000)`.

Common slips: `timeout`, `delay`, `elapsed`, `start`, `size`, `rate`, `limit` with no unit;
English word order such as `max_size`, `initial_delay`, `MAX_RETRIES`, `slowest_chunk`; the unit
only in a comment (`timeout = 120  # seconds`); a list like `times` or `durations` with no unit.

## Example

A cache for thumbnails, with an expiry and a size cap.

Violating: no units, and the qualifiers come first.

```python
CACHE_TTL = 600
MAX_CACHE_SIZE = 256 * 1024 * 1024

def evict(cache, now):
    age = now - cache.oldest_entry().stored_at
    if age > CACHE_TTL or cache.size > MAX_CACHE_SIZE:
        cache.pop_oldest()
```

Compliant: every quantity says its unit, and the qualifiers are last.

```python
CACHE_TTL_S = 600
CACHE_BYTES_MAX = 256 * 1024 * 1024

def evict(cache, now_s):
    age_s = now_s - cache.oldest_entry().stored_at_s
    if age_s > CACHE_TTL_S or cache.size_bytes > CACHE_BYTES_MAX:
        cache.pop_oldest()
```

## Before you commit

Read the staged diff once more and list every new or renamed name that holds a quantity, in
settings, constants, locals, parameters, attributes and fields. For each, check that the unit is
in the name and that any qualifier is the last word. Rename what fails, update its uses and the
tests, and check again before you commit.
