---
name: prometheus-bounded-label-values
description: Use whenever you add or change application metrics in service code - a Prometheus or prometheus_client-style Counter, Gauge, Histogram or Summary, its label names, or a `.labels(...)` call, in a metrics module or wherever code is instrumented (request handling, payments, imports, carts, background jobs) - even if the request only says to track, count, measure or break something down. Covers which values a metric label may take, so that metrics stay cheap to store and query.
---

# Metric labels take bounded values

## The rule

Metric labels only take values from a small bounded set; unbounded values such as user or customer ids, emails, order ids, raw URLs or exception messages never become label values.

- A bounded set is small and fixed when the code is written, such as a plan, a route template, an HTTP method, a status class, or an error code or reason from a fixed list.
- Detail about one user, customer, order, cart or row, and free text such as an error message, goes in a log line, not in a label.

## Why

Every distinct combination of label values is a separate time series that Prometheus stores,
indexes and keeps in memory. A label fed by ids, paths or messages grows a new series for every
customer, URL or wording, so the metric grows without limit, scrapes and queries slow down, and the
monitoring server can run out of memory. The Prometheus docs say it plainly: do not use labels to
store dimensions with high cardinality, such as user IDs, email addresses, or other unbounded sets
of values. Per-entity questions ("which customer?", "what exactly went wrong?") are answered from
logs, which are built for that.

## How to apply it

For every label you declare and every value you pass to `.labels(...)`:

1. Name the set its values come from. If you cannot list it, or it grows with customers, orders,
   rows or requests, it is unbounded.
2. Use the template, not the instance: the route pattern (`/orders/<order_id>`), not the requested
   path; the error code or exception class, not `str(exc)`.
3. Clamp what is almost bounded: map a value into a fixed list and send everything else to
   `"other"`.
4. When the request asks for a per-entity breakdown, give the bounded breakdown in the metric (by
   plan, reason, code, size or age bucket) and log the entity id or message beside it.

Common slips: `customer_id`, `user_id` or `email` labels "so we can see who is affected";
`request.path` or `request.url` as the endpoint; `str(exc)` or `exc.args[0]` as the error; one
gauge series per user or per cart.

## Example

Counting outgoing webhook deliveries.

Violating: one series per subscriber URL and per error wording.

```python
DELIVERIES = Counter("webhook_deliveries_total", "Webhook deliveries", ["url", "error"])
DELIVERIES.labels(url=subscription.url, error=str(exc)).inc()
```

Compliant: the event type and a clamped outcome are bounded; the URL and message go to the log.

```python
DELIVERIES = Counter("webhook_deliveries_total", "Webhook deliveries", ["event", "outcome"])
outcome = exc.code if exc.code in DELIVERY_ERROR_CODES else "other"
DELIVERIES.labels(event=event.type, outcome=outcome).inc()
log.warning("webhook to %s failed for %s: %s", subscription.url, event.id, exc)
```

## Before you commit

Go through the staged diff and list every metric it declares or records. For each label, write
down the set its values come from and check it is small and fixed. Move any id, email, path, URL or
message into a log line, and check again before you commit.
