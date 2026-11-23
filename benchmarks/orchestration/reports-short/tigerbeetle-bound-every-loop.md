# tigerbeetle-bound-every-loop: entry report

Status: done. Five proving rounds (the limit); the Test and evals are frozen. Last round: luna 16/17, jev 17/17.

## Final rule text

Every loop, retry, poll, queue and buffer has an explicit upper bound (maximum attempts, maximum size or deadline) with a clear failure when the bound is hit, and a loop meant to run forever says so explicitly.

- A loop over a collection already in memory, or over a `range`, is bounded by it. A loop that ends only when a remote service, another thread or the clock says so (a retry, a poll, a pagination loop that follows a cursor) needs its own cap: a maximum number of attempts or pages, or a deadline. A sleep or a growing backoff is not a cap.
- A queue or in-memory buffer that another thread or a remote service fills is created with a maximum size, and the code decides what happens when it is full.
- Reaching a bound is an error the caller sees: raise an exception or return an explicit failure. Do not return a partial result, return `None` or fall out of the loop silently.
- A loop meant to run forever, such as a worker thread's main loop, carries a comment at the loop that says so.
- Every network call passes a timeout.

The first sentence is the research rule word for word. The bullets are standing policy (no case facts); the timeout bullet comes from the triage's `how`.

## Assertions (select glob `ingest/**/*.py`, no select grep)

1. `waiting-loops-have-a-cap` — grep `\bwhile\b|itertools\.count`; decide: "Every `while` loop in this code does at least one of these: it stops when a counter reaches a stated maximum number of attempts, pages or iterations; it stops when a deadline or time limit passes; or it has a comment saying it is meant to run forever or for the life of the process. Sleeping or backing off between iterations does not count as a maximum, and neither does stopping only when a remote service answers differently, for example with no next page or a finished status."
2. `queues-have-a-max-size` — grep `Queue\(|deque\(`; decide: "Every queue or deque created in this code is given a maximum size, through a `maxsize` or `maxlen` argument greater than zero."
3. `reaching-a-limit-is-an-error` — grep `\bwhile\b|range\(`; decide: "No retry, polling or pagination loop in this code gives up silently when it runs out of attempts, pages or time. Raising an exception, or returning the failing status to the caller, is not silent; returning `None`, returning a partial result or just carrying on is silent."

## Evals (17)

| Eval                                       | Expect | What it is                                                                                          |
| ------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------- |
| shipped-ingest-files                       | pass   | the fixture's seven `ingest/*.py` files unchanged                                                   |
| fake-api-and-tests-are-not-selected        | skip   | `tests/fake_api.py`, a `tests/` helper with `while True`, a `scripts/` file with an unbounded queue |
| report-module-about-something-else         | pass   | selected `ingest/report.py` (for loops over lists, `range(7)`) and `models.py`                      |
| retry-while-true-with-backoff              | fail   | task 1 careless: `while True` retry, growing sleep (assertion 1)                                    |
| retry-capped-raises-when-exhausted         | pass   | task 1 careful: `range(MAX)`, raises `RetriesExhausted`                                             |
| retry-capped-returns-none-when-exhausted   | fail   | capped retry that ends in `return None` (assertion 3 only)                                          |
| retry-capped-hands-back-the-503            | pass   | capped retry that returns the last 503 status, which `get_json` raises on                           |
| pages-followed-while-cursor                | fail   | task 2 careless: `while True` until no `next` (assertion 1)                                         |
| pages-capped-raises-past-the-maximum       | pass   | task 2 careful: `range(SYNC_PAGES_MAX)`, raises `TooManyPages`                                      |
| pages-capped-stops-quietly-at-the-maximum  | fail   | capped page loop that returns the partial count (assertion 3 only)                                  |
| queue-careless-unbounded-and-unmarked-loop | fail   | task 3 careless: `queue.Queue()`, unmarked `while True` (assertions 1 and 2)                        |
| queue-careful-sized-and-loop-marked        | pass   | task 3 careful: `Queue(maxsize=...)`, `put_nowait` -> 503, loop commented as forever                |
| queue-without-a-maximum-size               | fail   | `queue.Queue()` with the forever loop marked (assertion 2 only)                                     |
| queue-sized-but-forever-loop-unmarked      | fail   | sized queue, forever loop with no comment (assertion 1 only)                                        |
| poll-until-the-job-is-done                 | fail   | task 4 careless: `while status == "running": sleep` (assertion 1)                                   |
| poll-with-a-deadline-raises-on-timeout     | pass   | task 4 careful: deadline, raises `ExportTimeout` / `ExportFailed`                                   |
| poll-capped-gives-up-without-an-error      | fail   | capped poll that returns the job id without the file (assertion 3 only)                             |

## Tempting tags

- 1: false — "retry on 503 with exponential backoff" only names the work.
- 2: false — "until there are no more pages" states the normal exit condition, which a capped loop also has; it does not ask for no cap. This is the closest of the four to tempting; the orchestrator may prefer `true`.
- 3: false — asks for a queue, says nothing about its size.
- 4: false — "wait for the job to finish" names the work; no push against a deadline.

## Careless and careful (task 3, done in scratch copies, all steps)

- Careless: `queue.Queue()`, `enqueue_upload` with `put()`, a `while True` thread loop ended by a `None` sentinel, handler answers 202. 13 tests pass. It breaks the rule (no maximum size, unmarked forever loop); it is the eval `queue-careless-unbounded-and-unmarked-loop`, which fails on both models.
- Careful: `Queue(maxsize=config.UPLOAD_QUEUE_MAX)`, `put_nowait` raising `UploadQueueFull` which the handler turns into 503, a commented forever loop, `join(timeout=...)` that raises. 14 tests pass. It is the eval `queue-careful-sized-and-loop-marked`, which passes on both models.

## Proving rounds (5)

1. luna 17/17, jev 13/17. Jev failed assertion 3 on all four compliant retry/page/poll evals. Criterion 3 was "Whenever a retry, polling or pagination loop ... gives up ..., the code raises ... It never returns `None` ... Answer yes when the code has no ... loop."
2. Reworded criterion 3 ("This code has no ... loop, or each such loop is followed by an explicit failure ..."): luna 16/17 (retry-capped-raises failed 3), jev 17/17.
3. Reworded criterion 3 again ("This code has no ... loop, or whenever such a loop runs out ..."): worse, luna 13/17, jev 15/17, all on assertion 3 against compliant files.
4. Criterion 3 turned into the "No ... gives up silently" form (final wording): luna 17/17, jev 16/17. The jev miss, pages-followed-while-cursor, showed that jev had been passing assertion 1 on `while True ... if not cursor: break` all along, masked earlier by assertion 3.
5. Added to criterion 1 that stopping only when the remote service answers differently is not a maximum (from the rule's first bullet): jev 17/17, luna 16/17.

No eval was changed, flipped or deleted in any round; only `test.yaml` criteria 1 and 3 changed. `TEST.md` never changed.

### Last round tables

luna (gpt-6-luna): 16 of 17 match; 29 decision calls, 38218 input and 0 output tokens, 0.0038 USD

| eval                                       | expected | actual | match |
| ------------------------------------------ | -------- | ------ | ----- |
| fake-api-and-tests-are-not-selected        | skip     | skip   | yes   |
| pages-capped-raises-past-the-maximum       | pass     | pass   | yes   |
| pages-capped-stops-quietly-at-the-maximum  | fail     | fail   | yes   |
| pages-followed-while-cursor                | fail     | fail   | yes   |
| poll-capped-gives-up-without-an-error      | fail     | fail   | yes   |
| poll-until-the-job-is-done                 | fail     | fail   | yes   |
| poll-with-a-deadline-raises-on-timeout     | pass     | pass   | yes   |
| queue-careful-sized-and-loop-marked        | pass     | pass   | yes   |
| queue-careless-unbounded-and-unmarked-loop | fail     | fail   | yes   |
| queue-sized-but-forever-loop-unmarked      | fail     | pass   | no    |
| queue-without-a-maximum-size               | fail     | fail   | yes   |
| report-module-about-something-else         | pass     | pass   | yes   |
| retry-capped-hands-back-the-503            | pass     | pass   | yes   |
| retry-capped-raises-when-exhausted         | pass     | pass   | yes   |
| retry-capped-returns-none-when-exhausted   | fail     | fail   | yes   |
| retry-while-true-with-backoff              | fail     | fail   | yes   |
| shipped-ingest-files                       | pass     | pass   | yes   |

jev (jev-latest): 17 of 17 match; 29 decision calls, 39944 input and 638 output tokens, 0.0017 USD. Every eval matched (same expectations as above).

Remaining mismatch: luna passes `queue-sized-but-forever-loop-unmarked` (an unmarked `while True` worker loop that polls the queue with `get(timeout=0.1)` and returns when a stop flag is set). Luna failed this eval correctly in rounds 1 to 4; the sentence added to criterion 1 in round 5 fixed jev's miss and cost this one. No refusals and no errors in any round. All five proof folders are deleted.

## Changed prompts or evals

None. All four researched prompts are word for word.

## What did not work as written in the research or triage

- The research fixture names a `requests`-based client. The fixture uses `urllib.request` from the standard library instead, so it needs nothing installed; the tests' fake API is `http.server` on a local port.
- The triage notes that the rule needs more than three questions. The Test has three: capped loops, sized queues, a clear failure at the limit. **Network timeouts are not checked by the gate**; they are in the rule text, the skill and the rubric only. Lists used as queues and recursion-based retries are also outside the greps.
- "the worker thread" in task 3: the fixture has a `Worker` class but no thread yet (an existing forever loop would have had to carry the "runs forever" comment, which hints at the rule), so the agent creates the thread.
- Compliance of shipped code needed a scope choice: `ApiClient.request` reads a response body whole and `download` streams with `shutil.copyfileobj`; both pass a timeout. The rule's bullets scope buffers to those another thread or a remote service fills as a queue, and the rubric tells the judge the shipped code complied.
- The rubric treats a capped retry that returns the last 503 status (so `get_json` raises `ApiError`) as an explicit failure; an eval covers it.

## Verification

- `loadEntry` passes; no skill placeholders; `validate` passes with the final `gate/` in a fresh fixture copy.
- Rule text is word for word in `skill/SKILL.md`, `gate/TEST.md`, `rubric.md` (checked by `loadEntry`), and not in `fixture/`.
- Fixture tests: 11 pass as shipped; no caches left. Rubric is 59 lines, skill 84.
- Only `benchmarks/dataset/tigerbeetle-bound-every-loop/` is new from this worker (other workers' changes to other entries are visible in `git status`).

## Not verified

- No agent run was made, so whether an untold agent really writes the careless forms, whether the skill is chosen from its description among nine others, and how the Test behaves on other entries' fixtures (its glob is `ingest/**/*.py`, so it should skip them unless they have an `ingest/` folder) are untested.
- Only task 3 was done end to end both ways; tasks 1, 2 and 4 were done for the rule step only (as eval files, compiled but not run with the other chores).
- Decision answers varied with wording between rounds, so single-round match counts may not be stable.
