# A cancelled request discards its pooled connection

The cache client of plover-profiles, the Python modules under `cache/`, takes connections from a
pool and sends commands on them. In every source file there that gives connections back to the
pool or discards them:

If a request on a pooled connection is cancelled or times out after the command was sent but before the reply was fully read, the connection must be closed and discarded, never returned to the pool.

- In plover-profiles, `cache/pool.py` hands out connections with `acquire()`; `release(conn)` puts a connection back in the pool for the next caller to reuse, and `discard(conn)` closes it and drops it from the pool. `CacheClient` in `cache/client.py` sends each command with `conn.send(...)` and reads each reply with `conn.read_reply()`.
- `read_reply()` reads one whole reply. When the server answers with an error, it raises `ReplyError` after reading that reply in full. Any other exception raised while sending or reading, such as `TimeoutError` from `asyncio.wait_for` or `asyncio.timeout`, `asyncio.CancelledError`, or a connection or protocol error, can leave a reply unread or half read. `asyncio.CancelledError` is a `BaseException`, so `except Exception` does not catch it.
- So a connection goes back through `release()` only once the reply to every command sent on it has been read in full, by a `read_reply()` call that returned or raised `ReplyError`. On every other way out, including a pipeline that stops with replies still unread, it goes through `discard()`.

The tests under `tests/`, and any `test_*.py` file, are not judged. A file that sends no command on
a pooled connection, such as the pool itself or the wire protocol, has nothing to judge, and
discarding a connection more often than needed is never wrong.
