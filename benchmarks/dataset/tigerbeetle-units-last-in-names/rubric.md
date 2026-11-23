# Rubric: quantity names carry their unit, with qualifiers last

## The rule

Names of quantities carry their unit or qualifier, placed last in order of descending significance (for example `latency_ms_max`, `upload_timeout_s`), rather than bare names such as `timeout` or prefix forms such as `max_latency_ms`.

- A quantity is a length of time, a deadline or clock reading, an amount of data, a rate or a count. The rule covers every name the code defines for one, or for a list of them: variables, constants, parameters, attributes and fields. Indexes, identifiers, codes, flags, text and raw data are not quantities, and a name a library defines, such as the `timeout` keyword of `urlopen`, is not the code's own.
- A unit is a short suffix such as `_ms`, `_s`, `_bytes` or `_per_s`, and a count's unit is the thing counted (`chunks`, `retries_max`). A ratio or multiplier needs no unit. A unit given only in a comment is not in the name.
- A name starts with what is measured, then the unit, then any qualifier such as `max`, `min`, `avg`, `total` or `initial`: `retry_delay_ms_max`, not `max_retry_delay_ms` or `retry_delay_max_ms`.

## What to look at

Grade the names the diff adds or renames in the Python code under `uploader/`: settings in
`Config`, module constants, locals, parameters, attributes and dataclass fields. Names under
`tests/` are not graded. Every name in `uploader/` before the diff followed the rule (for example
`chunk_bytes`, `request_timeout_s`, `retries_max`, `retry_delay_ms_max`, `started_s`,
`file_bytes`), so a diff that leaves those alone breaks nothing by doing so. For each new name
that holds a quantity, ask:

1. **Is the unit in the name?** A duration, deadline or clock reading ends its noun with `_s`,
   `_ms` or similar; a size with `_bytes` (or `_mib`, `_gib`); a rate with `_per_s`; a count names
   what it counts. `timeout`, `delay`, `start`, `elapsed`, `size`, `rate`, `burst`, `capacity` and
   `limit` on their own carry none. A unit only in a comment or docstring does not count.
2. **Do qualifiers come last, after the unit?** `max`, `min`, `avg`, `total`, `initial`, and words
   doing their job such as `slowest`, `average`, `peak` or `base`, go at the end:
   `chunk_duration_ms_max`, not `max_chunk_duration_ms`, `slowest_chunk_ms` or
   `chunk_duration_max_ms`. Upper-case constants follow the same order (`RETRIES_MAX`).

A multiplier such as `retry_delay_multiplier` needs no unit. Loop indexes, ids, HTTP statuses and
library keywords (`timeout=` of `urlopen`) are not graded; a unit in a value is not one in the name.

Then check that each numbered step of the task is done. The other steps count only toward whether
the task is done, never toward the rule. Ignore the values chosen and the design of the feature.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: most new quantity names are bare or qualifier-first.
- **4 to 6**: the rule is followed for some new names and broken for others.
- **7 to 9**: every new quantity name carries its unit with qualifiers last, with one small lapse
  or a step of the task left undone.
- **10**: the task is fully done, and every new quantity name carries its unit with any qualifier
  last.

What each looks like:

- **2**: `upload_timeout = 120` and `max_file_size = 5 * 1024**3` in `Config`, with
  `start = self.clock()` and `size = path.stat().st_size` in the client; or a rate limiter built on
  `rate`, `capacity` and `last`; or the units given only in comments.
- **5**: the settings are right (`requests_per_s_max`, `retry_delay_ms_initial`) but the code that
  uses them has `elapsed`, `wait` or `slowest`; or every name has its unit but qualifiers come
  first throughout (`max_file_bytes`, `initial_delay_ms`).
- **8**: every new name carries its unit, but one puts a qualifier first or before the unit
  (`max_delay_ms` or `delay_max_ms`) while the rest follow `delay_ms_max`; or all is right and
  one step, such as the changelog line, was skipped.
- **10**: for example `upload_timeout_s`, `file_bytes_max` and `deadline_s`; or
  `chunk_durations_ms`, `chunk_duration_ms_max` and `chunk_duration_ms_avg`; or
  `retry_delay_ms_initial` and `retry_delay_multiplier` beside `retry_delay_ms_max`, with every
  step of the task done.
