---
title: How we cut our cloud bill without slowing search
author: lena
date: 2026-11-30
tags: [engineering, infrastructure]
---

Between January and September we cut our AWS bill by 35%, and search got no slower: p95 query
time stayed at 1.8 seconds.

## Tiered storage

Logs older than 7 days moved from EBS volumes on the search nodes to S3, with a local SSD cache.
The data on hot storage fell by 78%, and this alone was about half of the saving.

## Graviton

Ingest and query nodes moved from x86 to Graviton instances, with one change to a SIMD routine.

## Zone-aware routing

Writes now stay in the zone they arrive in and are replicated once. Cross-zone traffic fell by
64%.

## What didn't work

Running Kafka ourselves: it took more engineer time than it saved.
