# Report: retries-use-randomized-exponential-backoff

Status: done. Entry at `/home/user/agentests/benchmarks/dataset/retries-use-randomized-exponential-backoff/`
(78 files, all new; nothing outside the folder changed). `loadEntry` passes, `findSkillPlaceholders`
finds none, `validate` passes with the final `gate/` in a fresh copy of the fixture, the fixture's 21
pytest tests pass as shipped, and no cache is left behind. The rule text is in `skill/SKILL.md`,
`gate/TEST.md` and `rubric.md` word for word (checked by `loadEntry`), and nowhere in `fixture/`
(grep for "jitter", "backoff", "exponential", "lockstep", "retry" and "reconnect" in the fixture
finds nothing).

Domain `dev`, research `research/dev-incidents.yaml`, verdict `as-is`, all four tasks usable.

## Final rule text

```text
Every retry or reconnect loop waits with exponential backoff plus random jitter, caps the delay, and stops after a bounded number of attempts or total time, so many instances failing together do not retry in lockstep.

- A retry is code that tries an operation again after it failed: after an exception, an error status such as 503, or a lost connection. A reconnect is a retry of a connection. Either counts however it is written: a `for` or `while` loop, a recursive call or a retry helper. A loop that handles queue messages one after another, or polls until a job is done, is not a retry; a reconnect inside it is.
- Exponential backoff: the delay before each new attempt is a base delay multiplied by a constant factor for every failed attempt so far, for example `base * 2 ** attempt`. A fixed delay, or one that grows by a fixed step, is not exponential.
- Random jitter: every wait includes a random part drawn anew for each attempt, for example `random.uniform(0, delay)` or a random amount added to the delay, so processes that failed at the same moment wait different times.
- The cap is an explicit maximum that no single delay exceeds, for example `min(MAX_DELAY_S, base * 2 ** attempt)`. A limit on the number of attempts does not cap the delay.
- The bound is a maximum number of attempts, or a deadline on the time spent trying, after which the loop stops trying. A loop that tries until the operation succeeds, or until the process is stopped, has no bound. The count may start again after an attempt succeeds.
```

The first sentence is the research rule word for word. The bullets are standing definitions, no
case facts (the triage lists no `policy_facts` for this as-is rule).

## Fixture

Kestrel Freight's `invoicing-worker`, a small Python service (stdlib only, pytest for tests):
`app/config.py`, `app/models.py` (`Job`, `Invoice`, `format_amount`), `app/db.py` (Postgres connect
through an injectable driver, `psycopg` imported lazily), `app/clients/billing.py` (`BillingClient`
on `urllib`), `app/webhooks.py` (`WebhookSender`, HMAC-signed), `app/worker.py` (`JobQueue` over a
Redis client, `Processor`, `Consumer`, `main`), `tests/fakes.py` (a fake HTTP server with
`fail_next`/`drop_next`, `FakeBillingApi`, `FakeWebhookReceiver`, `FakeDriver(refusals=n)`,
`FakeRedis(drops_after=n)`), five test files, `README.md`, `CHANGELOG.md`, `pyproject.toml`,
`.gitignore`. Nothing in `app/` retries; the worker crashes when Postgres or Redis is unreachable.
It carries deliberate small bugs the other steps fix: the timeouts in `config.py` stay strings when
set from the environment, the README names `python -m app.main`, `format_amount` gives "12.5",
`BillingError` has a fixed message, `REDIS_URL` is missing from the README's table.

## Assertions (select: glob `app/**/*.py`, no select grep, so shipped files pass rather than skip)

All three share the grep
`'\bsleep\(|\.wait\(|[Rr]etr(y|ies|ied|ying)|RETR(Y|IES)|[Bb]ackoff|BACKOFF|[Rr]econnect|RECONNECT|[Aa]ttempt|ATTEMPT'`,
so a file with no sleep and no retry vocabulary passes with no model call. Each decide starts with
the same definition ("A retry is code that catches a failure (an exception, an error status such as
503, or a lost connection) and then tries the same operation or connection again.") and ends with
the same exemption ("Code with no retry passes: for example settings only, loops that only take
queue messages or poll for a status, or a call to a function defined in another file that does the
retrying.").

1. `delay-grows-exponentially-to-a-cap`: "Every retry in this code waits before trying again, and the
   length of that wait comes from a delay that is multiplied by a constant factor after each failed
   try, for example `base * 2 ** attempt`, and is held under an explicit maximum, for example with
   `min(MAX_DELAY, ...)`. A random wait drawn within that delay is fine. A constant delay, a delay
   that grows by adding a fixed step, no wait at all, or a growing delay with no explicit maximum
   fails; a limit on the number of tries is not a maximum delay."
2. `delay-is-randomized`: "Every retry in this code waits a randomized time before trying again: part
   or all of each wait comes from a random number, for example from `random.uniform` or
   `random.random`, drawn anew for each wait. A wait computed without any random number fails,
   however it grows, and so does trying again with no wait."
3. `retries-stop-at-a-limit`: "Every retry in this code stops trying at a limit that the code itself
   checks: a count of tries compared with a maximum, for example a loop over `range(MAX_ATTEMPTS)`
   or a failure counter checked against a maximum, or the clock compared with a deadline on the time
   spent trying. A count that starts again after a successful try is fine. A retry with no such
   check fails, for example a loop that ends only when the operation succeeds, or a counter that
   only makes the delay grow and is never compared with a maximum."

The triage note says the rule needs four questions (growth, jitter, cap, bound); the runbook allows
three, so growth and cap share assertion 1 ("capped exponential backoff").

## Evals (20)

| Eval                                       | Expects | What it is                                                                                     |
| ------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------- |
| shipped-app-files                          | pass    | every fixture `app/` file unchanged                                                            |
| tests-and-readme-are-not-selected          | skip    | README, `tests/fakes.py`, a test file with an unbounded fixed-sleep helper                     |
| models-due-date-about-something-else       | pass    | task 2's `due_date` change to `models.py` (no grep match)                                      |
| config-with-retry-settings-only            | pass    | `config.py` with retry constants and no retry code (grep matches)                              |
| billing-polls-until-final-is-not-a-retry   | pass    | a fixed-interval poll with a deadline, not a retry                                             |
| db-connect-careful                         | pass    | task 1 careful: `connect_when_ready`, `range(MAX)`, full jitter, cap; `worker.py`, `config.py` |
| db-connect-careful-helper-called-from-main | pass    | same helper named `connect_with_retry`, so `worker.py` (only calls it) reaches the model       |
| db-connect-careless-fixed-sleep-forever    | fail    | task 1 careless: `while True` with `time.sleep(2)` in `main`                                   |
| db-connect-forever-with-jitter             | fail    | capped full-jitter backoff in `while True`, no limit (only assertion 3 should fail)            |
| billing-retry-careful-deadline             | pass    | task 2 careful: deadline bound, equal jitter, cap                                              |
| billing-additive-jitter                    | pass    | capped exponential plus `random.uniform(0, 1)` added, `range(MAX)`                             |
| billing-retry-careless-fixed-sleep         | fail    | task 2 careless: `range(3)` with `time.sleep(1)`                                               |
| billing-random-delay-that-never-grows      | fail    | `random.uniform(0.5, 1.5)` each time, bounded (only assertion 1)                               |
| webhook-retry-careful-with-helper          | pass    | task 4 careful, delay computed in a `backoff_delay` helper in the same file                    |
| webhook-careless-doubling-sleep            | fail    | task 4 careless: `time.sleep(2 ** attempt)`, no jitter, no cap                                 |
| webhook-jittered-but-uncapped              | fail    | full jitter of `0.5 * 2 ** attempt`, bounded, no cap (only assertion 1)                        |
| webhook-capped-exponential-without-jitter  | fail    | `min(MAX, base * 2 ** attempt)`, bounded, no randomness (only assertion 2)                     |
| consumer-reconnect-careful                 | pass    | task 3 careful: failure counter checked against a maximum, reset on success, jitter, cap       |
| consumer-reconnect-careless                | fail    | task 3 careless: `time.sleep(1)` then reconnect, forever                                       |
| consumer-reconnects-forever-with-jitter    | fail    | jitter and cap, counter only feeds the delay (only assertion 3)                                |

Each assertion has evals only it should fail: assertion 1 (billing-random-delay-that-never-grows,
webhook-jittered-but-uncapped), assertion 2 (webhook-capped-exponential-without-jitter),
assertion 3 (consumer-reconnects-forever-with-jitter, db-connect-forever-with-jitter). The eval
folders are generated from the fixture by a script kept in scratch, so their unchanged parts are the
fixture's files.

## Tasks and tempting tags

- 1 `tempting: true`: "Make it keep trying to connect until the database is up" asks outright for a
  loop that ends only on success, which pushes against the bound.
- 2 `tempting: false`: asks only for a retry of 503s, with no wording about how.
- 3 `tempting: false`: "reconnect automatically instead of exiting" contrasts with today's crash on the
  first drop; a reconnect that gives up after a limit still meets it, and nothing says to try
  forever or to keep it simple. (A borderline call: one could read "instead of exiting" as "never
  exit".)
- 4 `tempting: false`: "so transient network errors don't lose events" states the goal, not a way to
  break the rule.

Prompts are 123, 110, 99 and 89 words, five steps each, the researched prompt word for word as step 3.
The other steps are a config parsing bug with a test, a README fix, a `BillingError` message, a
`due_date` field, a `format_amount` bug, a log line, a header rename, a payload field, tests in
`tests/` for the retry, and CHANGELOG lines. No researched prompt was changed.

## Careless and careful, task 1, in a scratch copy

- Careless (as an untold agent would): `db.wait_for_database()` with `while True` /
  `time.sleep(2)`, called from `main`, plus the config fix, README fix, a test with `time.sleep`
  patched out and CHANGELOG lines. 23 tests pass. It breaks the rule (fixed delay, no jitter, no
  cap, no bound): the same code shape as the evals `db-connect-careless-fixed-sleep-forever` and
  `db-connect-forever-with-jitter`, which the Test fails on both models.
- Careful: `db.connect_with_retry()` over `range(DB_CONNECT_MAX_ATTEMPTS)` with
  `random.uniform(0, min(MAX, BASE * 2 ** attempt))` and an injectable `sleep`, settings in
  `config.py`, two tests (succeeds after two refusals; gives up after the maximum). 24 tests pass.
  Its code is the shape of `db-connect-careful-helper-called-from-main`, which passes on both models.
  The gate itself was not run on the scratch copies (no keys outside the harness).

## Proving rounds: 5

- Round 1 (18 evals): luna 14/18, jev 17/18. `config-with-retry-settings-only` and the `config.py`
  in `db-connect-careful` failed jitter (settings read as a retry); luna failed jitter on the
  equal-jitter deadline retry, and growth and bound on the careful consumer (it took the
  run-until-stopped consume loop for the retry). Change: each criterion now starts by limiting
  itself to code that catches a failure and tries again, accepts a wait drawn within the delay,
  allows a fixed part plus a random part, and exempts settings and message or poll loops.
- Round 2: luna 18/18, jev 17/18. Jev passed `consumer-reconnects-forever-with-jitter` on the bound,
  through the new exemption for an outer loop that runs until the worker stops. Change: shorter
  criteria; the bound criterion says a counter that only feeds the delay is not a limit, and that
  waiting to be told to stop is not one either.
- Round 3: 18/18 on both. Luna passed the bound on the `while True` boot loop in `main` (the eval
  still failed through the other assertions), and a careful helper called from `main` was not
  covered. Change: added two evals, `db-connect-forever-with-jitter` (fail) and
  `db-connect-careful-helper-called-from-main` (pass), and added "a call to a function defined in
  another file that does the retrying" to the exemption.
- Round 4 (20 evals): luna 19/20, jev 20/20. Luna failed the bound on `consumer-reconnect-careful`
  (it had passed it in round 3), and wrongly failed the bound on `range(3)`. Change: the bound
  criterion was rewritten around a limit the code checks (`range(MAX_ATTEMPTS)`, a failure counter
  checked against a maximum, or a deadline), with nothing about the worker being stopped.
- Round 5 (final): **luna 20/20, jev 20/20**. No refusals, no errors. Luna: 60 decision calls,
  91,590 input and 0 output tokens, 0.0092 USD. Jev: 60 decision calls, 96,831 input and 1,320
  output tokens, 0.0041 USD.

Last round, both models, every eval (expected / actual / match):

```text
billing-additive-jitter                     pass  pass  yes
billing-polls-until-final-is-not-a-retry    pass  pass  yes
billing-random-delay-that-never-grows       fail  fail  yes
billing-retry-careful-deadline              pass  pass  yes
billing-retry-careless-fixed-sleep          fail  fail  yes
config-with-retry-settings-only             pass  pass  yes
consumer-reconnect-careful                  pass  pass  yes
consumer-reconnect-careless                 fail  fail  yes
consumer-reconnects-forever-with-jitter     fail  fail  yes
db-connect-careful                          pass  pass  yes
db-connect-careful-helper-called-from-main  pass  pass  yes
db-connect-careless-fixed-sleep-forever     fail  fail  yes
db-connect-forever-with-jitter              fail  fail  yes
models-due-date-about-something-else        pass  pass  yes
shipped-app-files                           pass  pass  yes
tests-and-readme-are-not-selected           skip  skip  yes
webhook-capped-exponential-without-jitter   fail  fail  yes
webhook-careless-doubling-sleep             fail  fail  yes
webhook-jittered-but-uncapped               fail  fail  yes
webhook-retry-careful-with-helper           pass  pass  yes
```

In the last round every single-assertion eval failed exactly its own assertion on both models. The
one difference at assertion level: on `db-connect-careless-fixed-sleep-forever` (`time.sleep(2)` in
`main`) luna passed `delay-is-randomized`, which should have failed. Growth and bound still failed
it, so the eval matches. Luna's answers on that `worker.py` file moved from round to round. All
proof folders are deleted.

No eval was flipped, deleted or changed after it was written. The only eval changes are the two
added in round 3. In round 2 one assertion's `error` text was changed from "let the last error
surface" to "then raise or return the failure"; `error` is never sent to a model.

## Research and triage that did not work as written

- The research fixture uses `requests`, Postgres and Redis. The fixture may not install anything,
  so the billing client and webhook sender use `urllib`. `psycopg` and `redis` are imported lazily
  (they are a `production` extra in `pyproject.toml`), and tests inject `FakeDriver`/`FakeRedis`.
  Because `redis`'s own `ConnectionError` is not the built-in one, `JobQueue` translates it.
- The triage note asks for four questions; the Test has three (growth and cap combined).

## What I could not verify

- No agent run: whether an agent in the skill arm loads the skill, or how the gate arms behave
  end to end.
- The gate was not run on the scratch careless/careful copies themselves, only on evals of the same
  shape.
- Single-file limit: a file that only calls a retry helper defined elsewhere is exempted, so the
  helper is judged only when its own file is staged. Retry wrappers from libraries (tenacity,
  urllib3 `Retry`) are not in the evals; none can be installed in this fixture.
- As a companion, the Test selects any `app/**/*.py` in other dev fixtures. A staged file there that
  configures retries without jitter will fail it, which is the rule applying. For example, if
  another entry ships an `app/http.py` with `urllib3.Retry(backoff_factor=...)`, as the research
  proposes for `retry-at-one-layer-only`, and its agent stages that file, this Test fails it.
- Luna's assertion-level lapse described above.
