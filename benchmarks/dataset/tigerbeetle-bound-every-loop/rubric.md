# Rubric: every loop, retry, poll, queue and buffer is bounded

## The rule

Every loop, retry, poll, queue and buffer has an explicit upper bound (maximum attempts, maximum size or deadline) with a clear failure when the bound is hit, and a loop meant to run forever says so explicitly.

- A loop over a collection already in memory, or over a `range`, is bounded by it. A loop that ends only when a remote service, another thread or the clock says so (a retry, a poll, a pagination loop that follows a cursor) needs its own cap: a maximum number of attempts or pages, or a deadline. A sleep or a growing backoff is not a cap.
- A queue or in-memory buffer that another thread or a remote service fills is created with a maximum size, and the code decides what happens when it is full.
- Reaching a bound is an error the caller sees: raise an exception or return an explicit failure. Do not return a partial result, return `None` or fall out of the loop silently.
- A loop meant to run forever, such as a worker thread's main loop, carries a comment at the loop that says so.
- Every network call passes a timeout.

## What to look at

Grade the code the diff adds or changes under `ingest/`; code under `tests/` is not graded against
the rule. The code there before the diff complied: its network calls go through
`ApiClient._open`, which passes a timeout, and it had no retry, poll, cursor loop or queue. Ask:

1. **Loops that wait on something outside.** What stops each retry, poll and cursor loop if the
   API keeps answering 503, the job stays "running", or `next` never empties? A cap does:
   `for attempt in range(MAX_ATTEMPTS)`, a page count checked against a maximum, a deadline
   compared with a clock. `while True`, `while cursor:` and `while status == "running":` with only
   a sleep or backoff have none. A cap argument that defaults to `None` or infinity is no cap.
2. **Queues and buffers.** `queue.Queue()` or `deque()` with no maximum size, or a list used as a
   queue between threads, is unbounded. With a maximum size, a full queue must become an error
   answer or a wait with a timeout; a `put()` that blocks without limit is a lapse.
3. **What happens at the bound.** It raises or returns an explicit failure: a named exception, or
   the last 503 status handed back so the caller raises its usual error. Falling out of the loop
   and returning what was collected so far, `None` or nothing is a silent failure.
4. **Loops meant to run forever.** A worker thread's main loop may run until told to stop when a
   comment at the loop says so; without the comment it is a lapse. A blocking `queue.get()` inside
   such a loop is not a violation.
5. **Timeouts.** New network calls pass a timeout or go through `_open`.

Then check that each numbered step of the task is done. The other steps count only toward whether
the task is done, never toward the rule. Ignore style and the size of a cap.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a new retry, poll or cursor loop has no cap, or the new queue no maximum size.
- **4 to 6**: bounded in some places and not in others, or bounded but silent at the bound.
- **7 to 9**: everything new is bounded and fails clearly, with a minor lapse or a missing step.
- **10**: the task is fully done, and everything new is bounded and fails clearly.

What each looks like:

- **2**: `while True:` around the request with a growing sleep and no maximum; `while cursor:`
  that trusts the API to end; or `queue.Queue()` drained by an unmarked `while True` thread loop.
- **5**: the queue has a maximum size but `put()` blocks without limit and the thread loop is
  unmarked; or the retry is capped but then returns `None`; or the poll has a deadline but a
  cursor loop added in the same diff has no cap.
- **8**: every new loop and queue is capped and raises at the cap, but the worker thread's forever
  loop has no comment saying so, or one new network call has no timeout; or all is right and one
  step of the task was skipped.
- **10**: for example a retry over `range(MAX_ATTEMPTS)` that raises or returns the failing status
  when attempts run out; a page loop that raises after a maximum number of pages; a poll that
  raises at its deadline and when the job fails; a `Queue(maxsize=...)` whose full state becomes
  an error answer, drained by a loop commented as running for the life of the process.
