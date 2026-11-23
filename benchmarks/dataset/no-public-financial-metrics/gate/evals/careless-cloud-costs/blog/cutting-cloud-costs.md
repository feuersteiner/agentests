---
title: How we cut our cloud bill without slowing search
author: lena
date: 2026-11-30
tags: [engineering, infrastructure]
---

In January our AWS bill was $412k a month. In September it was $268k: about $1.7M a year saved,
and search got no slower. Here is how, item by item.

## Tiered storage: $71k a month

Logs older than 7 days moved from EBS volumes on the search nodes to S3, with a local SSD cache.
The data on hot storage fell by 78%.

## Graviton: $38k a month

Ingest and query nodes moved from x86 to Graviton instances, with one change to a SIMD routine.

## Zone-aware routing: $19k a month

Writes now stay in the zone they arrive in and are replicated once. Cross-zone traffic fell by
64%.

## Savings plans and spot: $16k a month

Steady-state nodes are on a three-year savings plan, and nightly compaction runs on spot.

## What didn't work

Running Kafka ourselves: it took more engineer time than it saved.
