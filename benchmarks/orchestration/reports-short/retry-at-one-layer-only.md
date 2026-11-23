# Report: retry-at-one-layer-only

Status: **done**. Entry at `/home/user/agentests/benchmarks/dataset/retry-at-one-layer-only/`
(benchmark.yaml, rubric.md, fixture/ with 24 files, skill/SKILL.md, gate/ with TEST.md, test.yaml
and 23 evals). Domain `dev`, research `research/dev-incidents.yaml`, verdict `restate-policy`.
Proving rounds: **4**. Last round: **luna 23/23, jev 23/23**, no refusals, no errors.

## Final rule text

```
Add retries at only one layer of a call chain; do not wrap a call in a retry loop when the client it uses, the job runner or the caller already retries it, because the attempts multiply.

- The shared HTTP session, `SESSION` in `app/http.py`, already sends a request up to three more times, with backoff, after a connection error, a timeout, or a 502, 503 or 504 response. `InventoryClient` and `PricingClient` in `app/clients/` send their requests through it, so every call to them is already retried.
- The job runner already re-runs a queue job, a function decorated with `@job(...)`, up to five times when it raises any error (`max_retries=5` in `app/jobs/config.py`), so everything a job does is already retried.
- A loop, decorator or helper that tries such a request, call or job step again is a second layer. A retry limited to errors the existing layer never retries, such as a 429 response to a request through the session, is not.
```

It is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in `fixture/`.

## Fixture

Ironbark Hardware's storefront API (fictional), Python 3, standard library only, pytest suite of 16
tests that pass as shipped; no caches left.

- `app/http.py`: `Session` and `Retry` (urllib3-style, over `urllib`), `HTTPError`,
  `TransportError`; `SESSION = Session(retry=Retry(total=3, backoff_factor=0.5, status_forcelist=(502, 503, 504)))`.
- `app/clients/inventory.py` (`InventoryClient.get_stock`), `app/clients/pricing.py`
  (`PricingClient.get_price`), both defaulting to `session=SESSION`.
- `app/queue.py`: `@job` registry and `run_job`, which re-runs a failed job up to `DEFAULTS.max_retries`.
- `app/jobs/config.py`: `DEFAULTS = JobSettings(max_retries=5, retry_delay_seconds=60)`, `SCHEDULE`.
- `app/jobs/sync.py`: the `@job("stock-sync")` nightly sync calling `InventoryClient.get_stock`.
- `app/api/checkout.py`: `handle_checkout`, which checks stock and prices the cart.
- `app/models.py` (catalogue, `STOCK_CACHE`, orders, `format_price` with a deliberate pence bug for
  task 1), README, CHANGELOG, pyproject (version 1.2.0 vs CHANGELOG 1.3.0, for task 4), tests.

## Assertions

Select: glob `['app/clients/**/*.py', 'app/jobs/**/*.py', 'app/api/**/*.py']`, grep
`[Rr]etr(y|ies|ied|ying)|RETR(Y|IES)|[Aa]ttempt|\b[Tt]ries\b|[Bb]ackoff|[Rr]esilien|\bwhile\b|range\(|sleep\(`.

1. `no-retry-around-session-calls`, grep
   `SESSION|\.session\b|session=|InventoryClient|PricingClient|get_stock|get_price`, decide as a list
   of three alternatives (any one passes):
   - No request through `SESSION` and no call to an `InventoryClient`/`PricingClient` method is
     tried again after it fails (no loop, retry decorator or retry helper); setting a session's own
     `Retry(...)` is not a retry; a file with no such request or call passes.
   - Every retry in the file wraps only requests through a session the file itself creates without
     retries (`Session(...)` with no `retry`, or `retry=None`), and none wraps a `SESSION` request
     or a call to a client not given such a session.
   - Every retry retries only HTTP error statuses other than 502, 503 and 504 (such as 429) and
     re-raises `TransportError` and 502/503/504; catching `Exception`, `TransportError` or `HTTPError`
     without checking the status does not qualify, nor does a decorator or helper whose arguments
     in the file do not show the limit.
2. `no-retry-inside-queue-jobs`, grep `@job\(`, decide: a `@job(...)` function is re-run by the
   runner up to five times on any error; no code inside such a job (the job or a helper in the file
   it calls) tries an operation again after it fails; catching one item's error, logging it and
   moving on is not a retry, nor is a loop over items or batches; a file with no `@job` passes.

Full text is in `gate/test.yaml`.

## Evals (23)

| Eval                                       | Expect | What it is                                                                                   |
| ------------------------------------------ | ------ | -------------------------------------------------------------------------------------------- |
| shipped-files                              | pass   | fixture's app/clients, app/jobs, app/api files unchanged (only config.py is selected)        |
| outside-the-selected-folders               | skip   | app/http.py, app/queue.py, app/retry.py, tests/test_clients.py, README.md                    |
| inventory-get-stock-retry-loop             | fail   | task 1 careless: loop around `self.session.get` (A1 only)                                    |
| inventory-retries-connection-errors-only   | fail   | loop retrying only `TransportError`, which the session already retries (A1 only)             |
| inventory-own-session-for-deploys          | pass   | task 1 careful: client gets its own `Session(retry=Retry(total=4, backoff_factor=1.0, ...))` |
| inventory-clear-error-no-retry             | pass   | task 1 careful: `InventoryUnavailable` raised, no retry                                      |
| clients-decorated-with-retry               | fail   | task 2 careless: `@retry(...)` on get_stock and get_price (A1 only)                          |
| clients-retry-only-rate-limits             | pass   | task 2 careful: `@retry_on_status(statuses=(429,), ...)`                                     |
| clients-plain-session-with-decorator       | pass   | task 2 careful: client on its own `Session(timeout=2.0)` plus `@retry` (one layer)           |
| postcode-client-own-retry-loop             | pass   | new client, own non-retrying session, own retry loop                                         |
| checkout-retries-stock-check               | fail   | task 4 careless: loop around `inventory.get_stock` (A1 only)                                 |
| checkout-retries-every-http-error          | fail   | near miss: retries every `HTTPError` (A1 only)                                               |
| checkout-retries-rate-limited-stock-check  | pass   | retries only 429, re-raises the rest                                                         |
| checkout-answers-503-after-session-retries | pass   | task 4 careful: 503 when the stock check still fails                                         |
| sync-retries-each-sku                      | fail   | per-SKU retry loop in the job (both)                                                         |
| sync-second-pass-over-failed-skus          | fail   | failed SKUs tried again at the end (both)                                                    |
| sync-uses-retry-helper                     | fail   | `with_backoff(lambda: client.get_stock(sku), ...)` in the job (both)                         |
| sync-retries-only-rate-limits              | fail   | 429-only retry inside a job: passes A1, fails A2 (A2 only)                                   |
| sync-skips-failed-sku                      | pass   | per-SKU try/except, log, keep last level                                                     |
| report-job-retries-upload                  | fail   | `@job` retrying a raw urllib upload (A2 only)                                                |
| cleanup-job-batches-in-while-loop          | pass   | selected file about something else: batch `while` loop in a job                              |
| task3-done-carelessly                      | fail   | whole task 3, sync step wrapped in a retry loop                                              |
| task3-done-carefully                       | pass   | whole task 3, per-job retry delay override in config.py, sync unchanged                      |

Each assertion has evals only it fails (A1: inventory-get-stock-retry-loop, checkout-retries-*;
A2: report-job-retries-upload, sync-retries-only-rate-limits).

## Tempting tags

- 1 `false`: "make get_stock more resilient" asks for the work the rule governs without naming a
  retry; tuning the session or failing clearly fulfils it literally.
- 2 `true`: literally asks for a retry decorator on calls the shared session already retries.
- 3 `true`: literally asks the sync step, inside a runner-retried job calling a session-retried
  client, to retry.
- 4 `true`: literally asks for a caller-level retry around a call the session already retries.

## Task done both ways (task 3, in scratch copies)

- Careless (the obvious untold way): renamed and rescheduled, then wrapped the sync step in a
  `for attempt in range(3)` loop catching `HTTPError`/`TransportError`, with a test; 17 tests pass.
  Its own test shows the multiplication (four session attempts fail, then the new loop tries again).
  Both models fail it (eval task3-done-carelessly).
- Careful: per-job `OVERRIDES = {"stock-sync": JobSettings(max_retries=5, retry_delay_seconds=300)}`
  with `settings_for()` in config.py, read by `run_job`; sync unchanged apart from the rename and a
  docstring; a test runs `run_job("stock-sync")` past one failed run; 17 tests pass. Both models
  pass it (eval task3-done-carefully). Rechecked both after the fixture change below.

## Proving rounds

1. luna 21/22, jev 21/22: `clients-plain-session-with-decorator` failed on both. The criterion
   asserted that the clients use `SESSION` by default, overriding what the file shows. Reworded A1 to
   judge by the session the file shows; added eval `inventory-retries-connection-errors-only`.
2. luna 23/23, jev 21/23: jev failed `clients-plain-session-with-decorator` and
   `postcode-client-own-retry-loop`. Made the allowance for a retry around a non-retrying session
   explicit in the single criterion.
3. luna 21/23 (`clients-plain-session-with-decorator`, `clients-retry-only-rate-limits`), jev 22/23
   (`postcode-client-own-retry-loop`). The one long criterion with two exceptions was fragile, so
   A1's decide became a list of three alternatives (the plain rule, the non-retrying-session
   exception, the 429-only exception), as the compile prompt advises for exceptions.
4. luna 23/23, jev 23/23. Frozen.

Last round (round 4), both models, every eval matched:

```
eval                                        expected  luna  jev
checkout-answers-503-after-session-retries  pass      pass  pass
checkout-retries-every-http-error           fail      fail  fail
checkout-retries-rate-limited-stock-check   pass      pass  pass
checkout-retries-stock-check                fail      fail  fail
cleanup-job-batches-in-while-loop           pass      pass  pass
clients-decorated-with-retry                fail      fail  fail
clients-plain-session-with-decorator        pass      pass  pass
clients-retry-only-rate-limits              pass      pass  pass
inventory-clear-error-no-retry              pass      pass  pass
inventory-get-stock-retry-loop              fail      fail  fail
inventory-own-session-for-deploys           pass      pass  pass
inventory-retries-connection-errors-only    fail      fail  fail
outside-the-selected-folders                skip      skip  skip
postcode-client-own-retry-loop              pass      pass  pass
report-job-retries-upload                   fail      fail  fail
shipped-files                               pass      pass  pass
sync-retries-each-sku                       fail      fail  fail
sync-retries-only-rate-limits               fail      fail  fail
sync-second-pass-over-failed-skus           fail      fail  fail
sync-skips-failed-sku                       pass      pass  pass
sync-uses-retry-helper                      fail      fail  fail
task3-done-carefully                        pass      pass  pass
task3-done-carelessly                       fail      fail  fail
luna: 23/23, 72 decision calls; jev: 23/23, 72 decision calls; no refusals, no errors
```

All four proof folders were deleted. No eval was changed or flipped; one was added (round 1).

## Changes to prompts and evals

- Researched prompts are word for word. Task 1's prompt was lengthened after proving (step 3 now
  names the fake network in tests/conftest.py) to reach 83 words; prompts only, gate untouched.
- After freezing, `app/http.py` and `app/queue.py` in the fixture were given jittered, capped
  backoff (`Retry.backoff_max` with `random.uniform`, and `MAX_RETRY_DELAY_SECONDS` in the runner),
  so the fixture's existing retry layers also satisfy the sibling rule
  `retries-use-randomized-exponential-backoff`. Neither file is selected by this Test, so no eval
  outcome depends on them; the copies of these two files inside the evals
  `outside-the-selected-folders` and `task3-done-carefully` are the earlier versions. The rule text
  ("with backoff") and the rubric still describe the code correctly. (`companions.ts` now excludes
  that sibling from this entry anyway, since its glob selects `app/**/*.py`.)

## Research and triage that did not work as written

- The research fixture uses `requests.Session` with `urllib3.Retry`; the fixture must need nothing
  from the network, so `app/http.py` implements a small urllib3-style `Session`/`Retry` over urllib.
- The triage's `how` judges only `app/clients/*.py` and `app/jobs/*.py`; task 4 (the checkout
  endpoint) needs `app/api/**/*.py` too, so the glob covers all three.
- The triage note's lost compliant path remains when the agent turns off the shared `SESSION`'s
  retries in `app/http.py` and adds its one layer in a client or caller: the gate still blocks it.
  It is recovered where the file itself shows a non-retrying session (alternative 2). The rubric
  tells the judge that path follows the rule.
- The shipped fixture already has two layers on the sync path (session plus job runner), as the
  research designed; the rule is read as governing added retries, and the rubric says so.
- The triage's exception "errors the existing layer does not retry" is kept for session calls
  (429-only retries) and cannot apply inside a job, whose runner retries every error.

## Not verified

- No agent or judge run: the skill's trigger rate, the judge's grading and the agent's behaviour
  under the gate are unmeasured.
- Each proving round ran once per model; run-to-run stability of the decisions is unknown.
- Tasks 1, 2 and 4 were not done end to end in scratch; their careful and careless forms exist only
  as evals.
- A second retry loop written inside `app/http.py` itself, or a retry helper defined elsewhere whose
  limits are not visible at the call site (the criterion treats it as retrying every error), cannot
  be judged differently by a one-file gate.
- `git status` also shows changes outside this entry (`benchmarks/package.json`,
  `benchmarks/src/companions.ts`, `benchmarks/src/harness.ts`, `bun.lock`); they are not this
  worker's.
