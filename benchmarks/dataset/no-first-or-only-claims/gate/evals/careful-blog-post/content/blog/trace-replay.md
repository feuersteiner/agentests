---
title: Trace replay, step through a failed request span by span
description: Trace replay records a failed request so you can step through it afterwards, from the browser to the database.
date: 2026-12-01
---

# Trace replay: step through a failed request span by span

An alert fires at 3 a.m. The error rate on checkout is up, the trace shows a 500 from the cart
service, and the log line says "cart not found". What the trace does not show is what the
service was sent. Trace replay, available from today, keeps that.

## What it does

Trace replay records a failed request and lets you step through it afterwards, span by span,
from the browser to the database. At each span you see the timing, the request and response
payloads, and the log lines written while the span was open.

## Which requests get a replay

Driftlog keeps a replay for every request that ends in a 5xx response or runs longer than your
latency threshold. The default threshold is 2 seconds. Other requests are sampled as before and
get no replay.

## Stepping through

Open a replay from an alert, from an error in the log view, or from its trace ID. Move forward
and back one span at a time. Pin a span to compare two replays side by side, and share a replay
with a link that works for members of your workspace.

## What leaves your service

Payload fields that match your redaction rules are masked in the SDK, before they leave the
service. Passwords, tokens and card numbers are masked by default.

## From the beta

Forty teams used trace replay between September and November. Jonas Brandt, staff engineer at
Tessel Freight, told us: "We had a checkout error that showed up twice a week and never in
staging. With the replay we stepped through one failed request and found the retry that was
sending a stale cart ID."

## Plans and SDKs

Trace replay is included in Team, which keeps replays for 7 days, and in Business, which keeps
them for 30 days. It works with the Node.js, Python and Go SDKs and the browser SDK, in the US
and EU regions. Ruby is planned for early 2027.

[Read the docs](https://driftlog.example/docs/trace-replay)
