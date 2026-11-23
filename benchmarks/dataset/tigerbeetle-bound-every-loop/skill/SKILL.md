---
name: tigerbeetle-bound-every-loop
description: Use whenever you write or change Python code in the ingest worker (ingest/*.py) that loops, retries, polls, paginates, waits on another service or thread, or holds work in a queue or buffer, for example a retry with backoff, following a cursor through pages, waiting for a job to finish, or handing work to a background thread, even if the request does not mention limits. Covers the upper bound each of these needs, what happens when the bound is hit, loops meant to run forever, and timeouts on network calls.
---

# Put a limit on every loop, retry, poll, queue and buffer

## The rule

Every loop, retry, poll, queue and buffer has an explicit upper bound (maximum attempts, maximum size or deadline) with a clear failure when the bound is hit, and a loop meant to run forever says so explicitly.

- A loop over a collection already in memory, or over a `range`, is bounded by it. A loop that ends only when a remote service, another thread or the clock says so (a retry, a poll, a pagination loop that follows a cursor) needs its own cap: a maximum number of attempts or pages, or a deadline. A sleep or a growing backoff is not a cap.
- A queue or in-memory buffer that another thread or a remote service fills is created with a maximum size, and the code decides what happens when it is full.
- Reaching a bound is an error the caller sees: raise an exception or return an explicit failure. Do not return a partial result, return `None` or fall out of the loop silently.
- A loop meant to run forever, such as a worker thread's main loop, carries a comment at the loop that says so.
- Every network call passes a timeout.

## Why

Everything has a limit in reality, so the code should name it. The happy path of a retry, a poll
or a cursor loop always ends; the bad day is the API that answers 503 for an hour, the job that
never leaves "running", or the cursor that points back at itself. Without a cap the worker hangs
silently and nobody is paged. An unbounded queue hides overload the same way, until memory runs
out. A stated limit turns each of these into an error someone sees.

## How to apply it

For each loop, queue or buffer you add or touch:

1. Ask what makes it stop. If the answer is "the other side eventually says so", add a cap: a
   maximum count in the loop header, or a deadline checked against `time.monotonic()`.
2. Put the limit in `ingest/config.py` as a named constant with its unit, next to the others.
3. Decide what happens at the limit and make it loud: raise a named exception that says what was
   being waited for and what the limit was.
4. Give every queue a `maxsize`, and handle the full case where the item is offered
   (`put_nowait` and an error to the caller, or `put(timeout=...)`).
5. If a loop really is meant to run until the process stops, write that in a comment on the loop.

Common slips: `while True` with a backoff that grows but attempts that never run out;
`while cursor:` that trusts the server; `while status == "running"` with only a sleep;
`queue.Queue()` with no size; a capped loop that ends by returning `None` or what it has so far.

## Example

Reading messages from a broker until a batch is full.

Violating: nothing ends the wait if the broker stays quiet, and the buffer has no limit.

```python
pending = queue.Queue()

def read_batch(broker):
    batch = []
    while len(batch) < BATCH_SIZE:
        message = broker.receive()
        if message:
            batch.append(message)
        else:
            time.sleep(1)
    return batch
```

Compliant: a size, a deadline, and an error at the deadline.

```python
pending = queue.Queue(maxsize=PENDING_MAX)

def read_batch(broker):
    batch = []
    deadline = time.monotonic() + BATCH_WAIT_S_MAX
    while len(batch) < BATCH_SIZE:
        if time.monotonic() >= deadline:
            raise BatchTimeout(f"batch not full after {BATCH_WAIT_S_MAX}s")
        message = broker.receive(timeout=RECEIVE_TIMEOUT_S)
        if message:
            batch.append(message)
    return batch
```

## Before you commit

Read the staged diff once more. For each `while`, each retry, each wait and each queue, name its
limit and the error raised when the limit is reached; for a loop that never ends, check its
comment says so. Fix what has no answer and check again before you commit.
