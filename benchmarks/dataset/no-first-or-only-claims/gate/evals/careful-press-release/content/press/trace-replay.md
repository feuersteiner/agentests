---
title: Driftlog launches trace replay
description: Engineers can step through a failed request span by span, from the browser to the database.
date: 2026-12-01
---

# Driftlog launches trace replay

**Lisbon, 1 December 2026.** Driftlog, the observability tool for web backends, today released
trace replay. It records a failed request and lets an engineer step through it afterwards, span
by span, from the browser to the database.

At each span the engineer sees the timing, the request and response payloads, and the log lines
written while the span was open. Driftlog keeps a replay for every request that ends in a 5xx
response or runs longer than a latency threshold the team sets. Payload fields that match the
team's redaction rules are masked in the SDK before they leave the service.

"When a request fails in production, the question is what the service was sent, and a trace
does not answer that," said Priya Raman, CTO of Driftlog. "Trace replay keeps the payloads and
the logs next to each span, so the engineer on call can read the failure instead of
reconstructing it."

Forty teams used trace replay in a private beta from September to November 2026. "We had a
checkout error that showed up twice a week and never in staging," said Jonas Brandt, staff
engineer at Tessel Freight. "With the replay we stepped through one failed request and found the
retry that was sending a stale cart ID."

Trace replay is included in the Team plan, which keeps replays for 7 days, and in the Business
plan, which keeps them for 30 days. It works with the Node.js, Python and Go SDKs and the
browser SDK, in the US and EU regions.

## About Driftlog

Driftlog is an observability tool for web backends, with logs, traces and alerts in one place.
The company was founded in 2022 and is based in Lisbon.

Press contact: press@driftlog.example
