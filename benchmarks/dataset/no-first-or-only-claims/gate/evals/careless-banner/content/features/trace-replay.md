---
title: Trace replay
description: Step through a failed request span by span, with the payloads and logs at each span.
---

# Trace replay

Step through a failed request span by span, from the browser to the database.

## See what each span was sent

At each span you see the timing, the request and response payloads, and the log lines written
while the span was open.

## Kept when a request fails

Driftlog keeps a replay for every request that ends in a 5xx response or runs longer than your
latency threshold. The default is 2 seconds. Only those requests get a replay; the rest are
sampled as before.

## Open, step, compare

Open a replay from an alert, from an error in the log view, or from its trace ID. Step forward
and back one span at a time, and pin a span to compare two replays side by side.

## Masked before it leaves

Payload fields that match your redaction rules are masked in the SDK. Passwords, tokens and card
numbers are masked by default.

## Plans

Trace replay is included in Team, with replays kept for 7 days, and in Business, with replays
kept for 30 days. It is not on the Free plan.

[Read the docs](https://driftlog.example/docs/trace-replay)
