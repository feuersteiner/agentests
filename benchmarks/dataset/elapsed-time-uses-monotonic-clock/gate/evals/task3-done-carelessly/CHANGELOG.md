# Changelog

## Unreleased

- Accept IPv6 upstreams in `RESOLVER_UPSTREAMS`, as `[2001:db8::53]:5353` or `2001:db8::53`.
- Pick upstreams at random, weighted by 1/RTT, and keep a smoothed RTT per upstream.

## 0.6.0

- Write one JSON line per query to the file named by `RESOLVER_QUERY_LOG`.
- Answer REFUSED, not SERVFAIL, to a client that is over its rate limit.

## 0.5.0

- Read the upstream list from `RESOLVER_UPSTREAMS`.
- Lower-case query names before logging them.

## 0.4.0

- Answer FORMERR to a packet that is not a query.
