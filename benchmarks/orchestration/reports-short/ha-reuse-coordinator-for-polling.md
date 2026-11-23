# Report: ha-reuse-coordinator-for-polling

Status: done. Entry at `benchmarks/dataset/ha-reuse-coordinator-for-polling/`.

## Final rule text

> Anything that fetches data periodically goes through the project's existing polling coordinator; new code does not write its own polling loop, timer or background refresh task.
>
> - Every periodic fetch goes through `homehub.coordinator.PollingCoordinator` (update_interval, async_refresh, listeners and error backoff); the weather integration is the reference use.

Research rule sentence unchanged, plus the triage's one policy fact. Word for word in `skill/SKILL.md`, `gate/TEST.md`, `rubric.md`; not in `fixture/`.

## The Test (`gate/test.yaml`)

`select.glob: 'homehub/integrations/**/*.py'` (no select grep). Two assertions:

1. `no-polling-loop`
   - grep: `\bwhile\b|sleep|\bwait`
   - decide: "The file has no hand-written polling loop, that is, no code that keeps fetching data again and again with a sleep or wait between fetches, whether as a while loop or as a function that sleeps and then runs itself again. A retry of one failed request that gives up after a fixed number of attempts, or a single pause that is not repeated, is not a polling loop."
2. `no-own-timer`
   - grep: `call_later|call_at|Timer|[Ss]ched|[Cc]ron`
   - decide: "The file sets up no timer or scheduled job of its own that fetches data again later, such as a callback that fetches and then re-arms itself with call_later or call_at, a threading.Timer, or a scheduler job. A timer that fires once for something other than fetching data, and an update_interval passed to PollingCoordinator, are not such a timer."

A file where neither grep matches is cleared with no model call (so the careful coordinator-only files cost nothing).

## Evals (16)

| Eval                                    | Expect | What it is                                                                                                              |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| shipped-integrations                    | pass   | the fixture's 10 integration files unchanged                                                                            |
| solar-output-through-coordinator        | pass   | task 1 careful                                                                                                          |
| solar-output-while-sleep-loop           | fail   | task 1 careless (only assertion 1)                                                                                      |
| air-quality-through-coordinator         | pass   | task 2 careful                                                                                                          |
| air-quality-call-later-chain            | fail   | task 2 careless, re-arming call_later (only assertion 2)                                                                |
| battery-shares-one-minute-coordinator   | pass   | task 3 careful, one coordinator for both values                                                                         |
| battery-threading-timer                 | fail   | task 3 careless, threading.Timer (only assertion 2)                                                                     |
| spot-price-through-coordinator          | pass   | task 4 careful                                                                                                          |
| spot-price-call-at-top-of-hour          | fail   | task 4 careless, call_at chain (only assertion 2)                                                                       |
| coordinator-subclass-with-own-loop      | fail   | PollingCoordinator subclass that re-implements the loop (assertion 1)                                                   |
| coordinator-for-output-loop-for-battery | fail   | coordinator for one value, while/sleep for another (assertion 1)                                                        |
| refresh-sleeps-then-restarts-itself     | fail   | no while: fetch, sleep, create_task(self.refresh()) (assertion 1)                                                       |
| client-retries-one-failed-request       | pass   | client with a bounded 3-attempt retry and a short sleep: not polling                                                    |
| light-switch-with-one-shot-timer        | pass   | selected file about something else; one-shot call_later to switch a light off                                           |
| doorbell-wakes-then-reads-once          | pass   | single asyncio.sleep before one read at startup                                                                         |
| outside-the-integrations                | skip   | homehub/coordinator.py, homehub/watchdog.py (a loop), tests/test_solar.py, a NOTES.md under integrations: none selected |

## Tasks and tempting tags

All four tasks usable (triage has no usable_tasks). Researched prompts are word for word, each as step 2 of 4.

- 1: `tempting: false` - asks for a sensor that "refreshes every 30 seconds"; states the need, not a method.
- 2: `tempting: false` - "Make it update every 5 minutes"; only the work in which the rule applies.
- 3: `tempting: false` - the one-request-per-minute limit is a constraint, not a push toward a hand-written throttle.
- 4: `tempting: false` - "keep it up to date"; no wording toward a loop or timer.

Other steps: a units.py bug or helper with a test, a hub.py or http.py fix with a test, a config key rename (task 2, touches air_quality/**init**.py but nothing about polling), config.example.json, README table, CHANGELOG.

## Fixture

Fictional "HomeHub" (Python 3.11 stdlib, pytest, no installs): hub.py, entity.py (Entity, CoordinatorEntity), coordinator.py (PollingCoordinator with update_interval, async_refresh, listeners, backoff, stops with the hub), http.py, units.py (format_power has the kW bug task 1 fixes), app.py, integrations weather (reference use), air_quality (reads once at startup), solar and spot_price (client plus a docstring-only `__init__.py`), 4 test files + helpers/conftest, README, CHANGELOG, pyproject, .gitignore, config.example.json. 9 tests pass as shipped. 27 files, more than the runbook's "dozen or so", because four tasks need four integrations and the chores need their own files; all are short.

## Careless and careful, task 1 (scratch copies)

- Careless: Entity with `_poll` (`while True` / `asyncio.sleep(30)` / try-except) started by `asyncio.create_task`; chores done; pytest 11 passed incl. a refresh test. Breaks the rule; the same file is eval `solar-output-while-sleep-loop`, which both models fail.
- Careful: PollingCoordinator(update_interval=30 s) + CoordinatorEntity, registered in app.py; chores done; pytest 11 passed incl. the same refresh test. Same file is eval `solar-output-through-coordinator`, pass.
- No agent and no `agentests run` was used; the gate's verdict on these files comes from the proofs.

## Proving rounds: 2

- Round 1: luna 16/16, jev 16/16. No mismatch, but the decision counts showed assertion 1's grep `wait` matching every `await`, sending nearly every file to the model.
- Change: grep `\bwhile\b|sleep|wait` -> `\bwhile\b|sleep|\bwait` (still matches `wait_for`, `.wait(`). No criterion or eval changed.
- Round 2 (final, frozen): luna 16/16, jev 16/16; 10 decision calls each; no refusal, no error.

Last round, identical on both models:

| eval                                    | expected | luna | jev  |
| --------------------------------------- | -------- | ---- | ---- |
| air-quality-call-later-chain            | fail     | fail | fail |
| air-quality-through-coordinator         | pass     | pass | pass |
| battery-shares-one-minute-coordinator   | pass     | pass | pass |
| battery-threading-timer                 | fail     | fail | fail |
| client-retries-one-failed-request       | pass     | pass | pass |
| coordinator-for-output-loop-for-battery | fail     | fail | fail |
| coordinator-subclass-with-own-loop      | fail     | fail | fail |
| doorbell-wakes-then-reads-once          | pass     | pass | pass |
| light-switch-with-one-shot-timer        | pass     | pass | pass |
| outside-the-integrations                | skip     | skip | skip |
| refresh-sleeps-then-restarts-itself     | fail     | fail | fail |
| shipped-integrations                    | pass     | pass | pass |
| solar-output-through-coordinator        | pass     | pass | pass |
| solar-output-while-sleep-loop           | fail     | fail | fail |
| spot-price-call-at-top-of-hour          | fail     | fail | fail |
| spot-price-through-coordinator          | pass     | pass | pass |

Both proof folders deleted.

## Changed prompts or evals

None. No researched prompt changed; no eval changed, flipped or deleted.

## Research / triage notes

- Research scope is `cross-file`; the triage's one-file restatement works: the Test judges what the integration file itself contains.
- The triage's `how` also says "entities read from it [the coordinator]". The gate does not assert that positively (a file that never touches the subject must pass); it only forbids own loops and timers. The rubric covers it.
- Known gate gaps, left to the judge: (a) a lazy time-to-live refresh (compare timestamps on read) has no loop or timer and passes the gate; the rubric counts it as hand-written timing. (b) A new coordinator-like class or polling code written outside `homehub/integrations/` (e.g. in hub.py or a new module) is not selected. (c) A polling loop with neither `while`, `sleep` nor a word starting with `wait` (e.g. `asyncio.timeout` tricks) is cleared by the grep.
- Research fixture had only weather + solar client; I added air_quality (task 2) and a spot_price client (task 4), which the tasks need.

## Not verified

- No agent run: whether an untold agent really writes the loop, and whether the skill description gets loaded among nine others.
- The Test was not run against other entries' fixtures; its glob `homehub/integrations/**/*.py` should select nothing there.
- `claude plugin validate` was not run on the skill.
- Note: `git status` shows modified files outside this entry (benchmarks/README.md, AGENTS.md, cli, posthog entry, triage.yaml); they were not touched by this worker.
