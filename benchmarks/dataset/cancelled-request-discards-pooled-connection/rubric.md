# Rubric: a cancelled request discards its pooled connection

## The rule

If a request on a pooled connection is cancelled or times out after the command was sent but before the reply was fully read, the connection must be closed and discarded, never returned to the pool.

- In plover-profiles, `cache/pool.py` hands out connections with `acquire()`; `release(conn)` puts a connection back in the pool for the next caller to reuse, and `discard(conn)` closes it and drops it from the pool. `CacheClient` in `cache/client.py` sends each command with `conn.send(...)` and reads each reply with `conn.read_reply()`.
- `read_reply()` reads one whole reply. When the server answers with an error, it raises `ReplyError` after reading that reply in full. Any other exception raised while sending or reading, such as `TimeoutError` from `asyncio.wait_for` or `asyncio.timeout`, `asyncio.CancelledError`, or a connection or protocol error, can leave a reply unread or half read. `asyncio.CancelledError` is a `BaseException`, so `except Exception` does not catch it.
- So a connection goes back through `release()` only once the reply to every command sent on it has been read in full, by a `read_reply()` call that returned or raised `ReplyError`. On every other way out, including a pipeline that stops with replies still unread, it goes through `discard()`.

## What to look at

When the agent started, each `CacheClient` method acquired a connection, sent one command, read
its reply, called `release` after a clean read or a `ReplyError`, and called `discard` in an
`except BaseException:` branch. Read the non-test code the diff adds or changes under `cache/`,
and for every path from `send` to the end of the method ask:

1. **Timeout and cancellation.** When the new timeout fires, or the caller's task is cancelled,
   does the connection reach `discard`? A `finally: self._pool.release(conn)`, or an
   `except TimeoutError:` branch that releases the connection or falls through to a `release`
   (for example to return `None` as a miss), breaks the rule. Returning `None` or raising another
   error after discarding is fine.
2. **Leaks.** Is anything left that neither releases nor discards? A handler that is only
   `except Exception:` lets `CancelledError` skip both, leaving the connection open and lost.
3. **Pipelines.** In `get_many`, is the connection released only after one `read_reply()` per
   command sent? Releasing after a `ReplyError` on one reply while later replies are unread
   breaks the rule, even though that branch mirrors the single-command methods. Reading the
   rest first, or discarding, complies. Calling `get` once per key is not a pipeline and does
   not break the rule, though it does not do what the task asked.

Tests may do anything. Code outside `cache/` and the task's other steps count only toward
whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a timed-out, cancelled or half-read connection is returned to the pool on the main
  path of the new code.
- **4 to 6**: the new code discards on timeout but leaks on cancellation, or one path is right and
  another wrong.
- **7 to 9**: every way out discards unless all replies were read; a minor lapse, or a step of
  the task missing.
- **10**: the whole task is done and every path follows the rule.

What each looks like:

- **2**: `get` rewritten as `try: ... return await asyncio.wait_for(conn.read_reply(), 0.2)`
  with `finally: self._pool.release(conn)`; or `except TimeoutError: self._pool.release(conn);
  return None`; or `get_many` with `finally: self._pool.release(conn)` around the read loop.
- **5**: the timeout discards, but the new code catches only `Exception`, so a cancellation leaks
  the connection; or `get` is right but `get_many` releases after a `ReplyError` with replies
  still unread.
- **8**: every path discards unless all replies were read, but a test, the README or the
  changelog is missing. Discarding more often than needed, such as on every `ReplyError`, is
  allowed and costs nothing here.
- **10**: the timeout sits inside the `try` that discards on `BaseException`, or a timed-out read
  is discarded before `None` is returned; `get_many` reads every reply, collecting any
  `ReplyError`, before it releases, and discards on anything else; every other step is done.
