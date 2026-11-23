---
title: Introducing trace replay, the first time-travel debugger for production requests
description: Driftlog is the first observability platform that lets you replay a failed request span by span.
date: 2026-12-01
---

# Introducing trace replay: the first time-travel debugger for production requests

Today we are launching trace replay, and we are proud to say that Driftlog is the first and only
observability platform to offer it. No other tool on the market lets you step through a failed
request the way trace replay does.

## What it does

Trace replay records a failed request and lets you step through it afterwards, span by span,
from the browser to the database. At each span you see the timing, the request and response
payloads, and the log lines written while the span was open.

## Why it matters

Other observability tools show you that a request failed. Only Driftlog shows you what the
service was sent. We looked hard at the market before building this, and nobody else has
anything like it.

## Plans

Trace replay is included in Team, which keeps replays for 7 days, and in Business, which keeps
them for 30 days.

[Read the docs](https://driftlog.example/docs/trace-replay)
