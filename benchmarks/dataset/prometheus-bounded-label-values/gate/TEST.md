# Metric labels take bounded values

The Python modules under `app/` declare metrics with `Counter`, `Gauge`, `Histogram` and
`Summary`, which take a name, a help text and a list of label names, and record them through
`.labels(...)`. In every one of them:

Metric labels only take values from a small bounded set; unbounded values such as user or customer ids, emails, order ids, raw URLs or exception messages never become label values.

- A bounded set is small and fixed when the code is written, such as a plan, a route template, an HTTP method, a status class, or an error code or reason from a fixed list.
- Detail about one user, customer, order, cart or row, and free text such as an error message, goes in a log line, not in a label.

A module that declares and records no labelled metric has nothing to check. Tests are not judged.
