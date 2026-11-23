---
name: cancelled-request-discards-pooled-connection
description: Use whenever you write or change Python code under cache/ that takes a connection from the pool (acquire, release, discard) and sends commands on it - new CacheClient methods, timeouts or deadlines around cache calls, cancellation, retries, pipelining or batching several commands on one connection, or error handling around send and read_reply - even if the request does not mention the pool. Covers when a pooled connection may go back to the pool and when it must be closed instead.
---

# A cancelled request discards its pooled connection

## The rule

If a request on a pooled connection is cancelled or times out after the command was sent but before the reply was fully read, the connection must be closed and discarded, never returned to the pool.

- In plover-profiles, `cache/pool.py` hands out connections with `acquire()`; `release(conn)` puts a connection back in the pool for the next caller to reuse, and `discard(conn)` closes it and drops it from the pool. `CacheClient` in `cache/client.py` sends each command with `conn.send(...)` and reads each reply with `conn.read_reply()`.
- `read_reply()` reads one whole reply. When the server answers with an error, it raises `ReplyError` after reading that reply in full. Any other exception raised while sending or reading, such as `TimeoutError` from `asyncio.wait_for` or `asyncio.timeout`, `asyncio.CancelledError`, or a connection or protocol error, can leave a reply unread or half read. `asyncio.CancelledError` is a `BaseException`, so `except Exception` does not catch it.
- So a connection goes back through `release()` only once the reply to every command sent on it has been read in full, by a `read_reply()` call that returned or raised `ReplyError`. On every other way out, including a pipeline that stops with replies still unread, it goes through `discard()`.

## Why

The server answers every command it receives, whether or not anyone is still waiting. If a
request gives up after sending, its reply is still on its way, and a connection put back in the
pool hands that stale reply to the next, unrelated caller. In March 2023 ChatGPT hit exactly this:
a spike of cancelled Redis requests returned connections with unread replies to the pool, and
some users saw other users' chat titles and payment details. A `finally: release(conn)` looks
tidy and is the bug.

## How to apply it

1. Acquire, then put `send` and every `read_reply` inside one `try`.
2. Call `release(conn)` only after the last reply has been read: after the `try`, or in an
   `except ReplyError:` branch when that error came from the last reply still owed.
3. Discard in `except BaseException:` (or a bare `except:`), then re-raise. That catches
   `CancelledError`, which `except Exception` misses.
4. Put a timeout inside that `try`, around the read. If a timeout should become a miss, discard
   first, then return `None`.
5. In a pipeline, count the replies owed. If one raises `ReplyError`, keep reading the rest
   before releasing, or discard.

Slips to watch for: `finally: self._pool.release(conn)`; `except TimeoutError:` that releases
because "the connection is fine, just slow"; `except Exception:` as the only cleanup; copying the
single-command `except ReplyError: release` branch around a loop of reads.

## Example

A rate limiter counts requests with `INCR`, and the web framework cancels the handler when the
HTTP client disconnects.

Violating: a cancellation during `read_reply()` returns the connection with the reply unread.

```python
async def incr(self, key: str) -> int:
    conn = await self._pool.acquire()
    try:
        await conn.send("INCR", key)
        return await conn.read_reply()
    finally:
        self._pool.release(conn)
```

Compliant: only a fully read reply lets the connection go back.

```python
async def incr(self, key: str) -> int:
    conn = await self._pool.acquire()
    try:
        await conn.send("INCR", key)
        count = await conn.read_reply()
    except ReplyError:
        self._pool.release(conn)
        raise
    except BaseException:
        await self._pool.discard(conn)
        raise
    self._pool.release(conn)
    return count
```

## Before you commit

For every `acquire()` in the diff, follow each way out after the first `send`: a clean read, a
`ReplyError`, a timeout, a cancellation, any other exception, an early `return` or `break`. Each
must end in exactly one `release` (only when every reply was read) or `discard` (every other
case). Fix what fails and check again.
