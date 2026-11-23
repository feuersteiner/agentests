# Quantity names carry their unit, with qualifiers last

The Python files under `uploader/` are the uploader: its settings, its HTTP client and its summary
report. They hold many timeouts, delays, sizes and counts, so:

Names of quantities carry their unit or qualifier, placed last in order of descending significance (for example `latency_ms_max`, `upload_timeout_s`), rather than bare names such as `timeout` or prefix forms such as `max_latency_ms`.

- A quantity is a length of time, a deadline or clock reading, an amount of data, a rate or a count. The rule covers every name the code defines for one, or for a list of them: variables, constants, parameters, attributes and fields. Indexes, identifiers, codes, flags, text and raw data are not quantities, and a name a library defines, such as the `timeout` keyword of `urlopen`, is not the code's own.
- A unit is a short suffix such as `_ms`, `_s`, `_bytes` or `_per_s`, and a count's unit is the thing counted (`chunks`, `retries_max`). A ratio or multiplier needs no unit. A unit given only in a comment is not in the name.
- A name starts with what is measured, then the unit, then any qualifier such as `max`, `min`, `avg`, `total` or `initial`: `retry_delay_ms_max`, not `max_retry_delay_ms` or `retry_delay_max_ms`.

Tests and their fakes under `tests/` are not covered.
