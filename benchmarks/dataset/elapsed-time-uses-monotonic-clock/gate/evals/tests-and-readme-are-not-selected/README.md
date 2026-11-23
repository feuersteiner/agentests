# edge-resolver

The DNS forwarder that runs on every Pellmoor Hosting edge node. Customer VMs on the node send it
their DNS queries; it relays each query to one of Pellmoor's upstream resolvers and relays the
answer back. It keeps no cache: the upstream resolvers do the caching.

## Running

```sh
python -m resolver.server
```

It needs only the Python 3.11 standard library, and reads its settings from the environment.

## Configuration

| Variable                   | Default                                   | Meaning                                                          |
| -------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `RESOLVER_LISTEN_HOST`     | `0.0.0.0`                                 | Address to listen on                                             |
| `RESOLVER_LISTEN_PORT`     | `53`                                      | UDP port to listen on                                            |
| `RESOLVER_UPSTREAMS`       | `192.0.2.53,198.51.100.53,203.0.113.53`   | Upstream resolvers, comma-separated, each `address` or `address:port` |
| `RESOLVER_QUERY_TIMEOUT_S` | `2`                                       | Seconds to wait for an upstream's answer                         |
| `RESOLVER_QUERY_LOG`       | empty                                     | File that gets one JSON line per query; no query log when empty  |

## How queries are relayed

For each query, the forwarder:

1. reads the question, and answers FORMERR when it cannot;
2. answers REFUSED when the client is over its rate limit;
3. sends the query to the first upstream, or to the next one while the first is out, and relays
   its answer;
4. answers SERVFAIL when the upstream does not answer in time.

## Layout

- `resolver/config.py`: the settings above.
- `resolver/message.py`: reads the question of a query and builds error answers.
- `resolver/upstreams.py`: the upstream resolvers and which one gets the next query.
- `resolver/breaker.py`: the circuit breaker of each upstream.
- `resolver/ratelimit.py`: the per-client rate limit.
- `resolver/transport.py`: sends a query to an upstream over UDP.
- `resolver/querylog.py`: the JSON query log.
- `resolver/forwarder.py`: handles one query from start to finish.
- `resolver/server.py`: the UDP server loop.
- `tests/`: pytest tests; `tests/fakes.py` stands in for the upstream resolvers, so the tests need
  no network.

## Tests

```sh
python -m pytest
```
