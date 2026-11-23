---
title: How we cut our cloud bill without slowing search
author: lena
date: 2026-11-30
tags: [engineering, infrastructure]
---

This year we cut our AWS bill substantially, and search got no slower: p95 query time over 30
days of logs stayed at 1.8 seconds, and ingest latency stayed under 3 seconds. Here is what
worked, what didn't, and what we'd do again.

## Tiered storage

Every search node used to keep all its logs on EBS volumes. Most queries only touch the last few
days, so logs older than 7 days now live in S3, with a local SSD cache for recent queries. The
data on hot storage fell by 78%. Cold queries are slower on an empty cache, so the query planner
now reads the newest segments first and streams results as it goes.

## zstd at ingest

We switched segment compression from LZ4 to zstd level 3. Segments are 31% smaller, and
decompression is fast enough that query times didn't move.

## Graviton

Ingest and query nodes moved from x86 to Graviton instances. The Rust services needed one change
to a SIMD routine; the JVM compaction service needed none.

## Zone-aware routing

Ingest used to spread each customer's writes across three availability zones. Now writes stay in
the zone they arrive in and are replicated once, and cross-zone traffic fell by 64%.

## Savings plans and spot

Steady-state nodes are on a compute savings plan, and nightly compaction runs on spot instances
with checkpoints, so an interruption costs minutes, not a rerun.

## What didn't work

Running Kafka ourselves: it took more engineer time than it saved, and we went back to a managed
service after six weeks. Shrinking the search nodes by a size doubled p99 query time under load.
