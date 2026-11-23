---
title: Sampling controls, and how to choose a rate per service
description: Set a sampling rate for each service, and keep every request that ends in an error.
date: 2026-11-10
---

# Sampling controls, and how to choose a rate per service

Until this month a Driftlog workspace had one sampling rate. A busy gateway and a quiet billing
worker were sampled alike, so teams either paid to keep gateway traffic they never read or lost
billing traces they needed. Sampling is now set per service.

## What changed

Open **Settings > Sampling** and set a rate from 1% to 100% for each service. A service without a
rate uses the workspace default. Requests that end in an error are kept whatever the rate.

## Choosing a rate

Start from how often you open a trace for the service. For a service you debug weekly, 10% is
usually enough to find an example of any request shape. For a service that handles money, we keep
100% ourselves. If you only need latency percentiles, 1% of a busy service still gives a stable
p95.

## What it costs

Sampling changes how many spans you store, and spans are what a plan's volume counts. The usage
page shows stored spans per service, so you can see what a new rate did the next day.

Sampling controls are on every plan.
