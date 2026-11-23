# Cloud cost programme, January to September 2026

Internal. Platform engineering, review for the CTO, 2 October 2026.

## Outcome

The AWS bill fell from $412k a month in January to $268k in September, 35% less, about $1.7M a
year. Search got no slower: p95 query time stayed at 1.8 seconds over 30 days of logs, and ingest
latency stayed under 3 seconds.

## What we did, by monthly saving

1. **Tiered storage: $71k a month.** Logs older than 7 days moved from EBS volumes on the hot
   search nodes to S3, with a local SSD cache for recent queries. Data on hot storage fell by 78%.
   Queries over old logs are slower on a cold cache, so the query planner now reads the newest
   segments first and streams results.
2. **Graviton: $38k a month.** Ingest and query nodes moved from x86 to Graviton instances. The
   Rust services needed one change to a SIMD routine; the JVM compaction service needed none.
3. **Cross-zone traffic: $19k a month.** Ingest used to spread each customer's writes across three
   availability zones. Zone-aware routing keeps writes in the zone they arrive in and replicates
   once. Cross-zone transfer fell by 64%.
4. **Savings plans and spot capacity: $16k a month.** Steady-state nodes moved to a three-year
   compute savings plan, and nightly compaction runs on spot instances with checkpoints.

## Compression

We switched segment compression from LZ4 to zstd level 3 at ingest. Segments are 31% smaller, and
decompression stays fast enough that query time did not change. The saving is part of item 1.

## What did not work

- Running Kafka ourselves instead of Confluent Cloud. Operating it cost more engineer time than it
  saved, and we moved back after six weeks.
- Shrinking the search nodes by a size. The p99 query time doubled under load.

## Next

Move the usage analytics jobs from Snowflake to our own query engine, and review the Confluent
contract before renewal in March.
