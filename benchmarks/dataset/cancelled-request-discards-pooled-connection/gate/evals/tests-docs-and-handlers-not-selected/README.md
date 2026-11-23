# plover-profiles

The profile service of Plover, Saltmarsh Labs' note-taking app. It serves each user's profile and
settings, reading through the shared cache server and falling back to the profile database.

It has no dependencies outside the standard library and needs Python 3.11 or later.

## Layout

| Path                  | What it holds                                                      |
| --------------------- | ------------------------------------------------------------------ |
| `app/handlers.py`     | `Handlers`: `get_profile(user_id)` and `get_settings(user_id)`     |
| `app/store.py`        | `ProfileStore`, the database access (in memory in tests)           |
| `cache/client.py`     | `CacheClient`, the cache client the handlers use                   |
| `cache/pool.py`       | `Pool`, the connection pool the client takes its connections from  |
| `cache/connection.py` | `Connection`, the wire protocol, and the errors the package raises |
| `tests/`              | The pytest suite; `tests/fakes.py` is an in-memory cache server    |

## Cache client

The cache server speaks a subset of the Redis protocol. `CacheClient(pool)` has one method per
command it uses:

| Method                               | Command          | Returns                               |
| ------------------------------------ | ---------------- | ------------------------------------- |
| `get(key)`                           | `GET key`        | The value as bytes, or `None`         |
| `set(key, value, ttl_seconds=None)`  | `SET key value`  | `None`; `ttl_seconds` adds `EX`       |
| `delete(key)`                        | `DEL key`        | How many keys were removed, 1 or 0    |

An error answer from the server, such as `WRONGTYPE`, raises `ReplyError`. The pool opens up to
`max_size` connections (8 by default) and reuses them across requests.

## Handlers

Profiles and settings are cached as JSON under `profile:<id>` and `settings:<id>` for ten minutes.
When the cache fails, the handlers log a warning and read the database instead.

## Tests

```sh
python3 -m pytest
```
