# Every loop, retry, poll and queue is bounded

The Python files under `ingest/` are the ingest worker: its API client, its worker and its web
handler. They talk to a remote API and pass work between threads, so:

Every loop, retry, poll, queue and buffer has an explicit upper bound (maximum attempts, maximum size or deadline) with a clear failure when the bound is hit, and a loop meant to run forever says so explicitly.

- A loop over a collection already in memory, or over a `range`, is bounded by it. A loop that ends only when a remote service, another thread or the clock says so (a retry, a poll, a pagination loop that follows a cursor) needs its own cap: a maximum number of attempts or pages, or a deadline. A sleep or a growing backoff is not a cap.
- A queue or in-memory buffer that another thread or a remote service fills is created with a maximum size, and the code decides what happens when it is full.
- Reaching a bound is an error the caller sees: raise an exception or return an explicit failure. Do not return a partial result, return `None` or fall out of the loop silently.
- A loop meant to run forever, such as a worker thread's main loop, carries a comment at the loop that says so.
- Every network call passes a timeout.

Tests and their fake API under `tests/` are not covered.
