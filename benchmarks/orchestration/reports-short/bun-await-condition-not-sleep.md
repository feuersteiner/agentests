# Report: bun-await-condition-not-sleep

Status: done. Entry at `benchmarks/dataset/bun-await-condition-not-sleep/`.

## Final rule text

Tests never wait a fixed amount of time for something to happen; they await the event or promise itself, or poll the condition with a deadline, and behaviour that is about time uses fake timers or an injected clock.

- A fixed wait is any pause whose length the test picks in the hope that it is long enough: `Bun.sleep(n)`, a `setTimeout` promise, or a fixed number of `await Promise.resolve()` or other empty ticks before an assertion.
- `test/helpers.ts` has `once(emitter, event)` and `waitFor(predicate, timeoutMs)` for this.
- A delay inside a fake job, handler or loader that only stands in for slow work is not a wait, provided the test itself then awaits the event or promise and not the clock.

The first sentence is the research rule word for word. The three bullets are standing policy I added (the triage verdict is `as-is`, with no `policy_facts`): what counts as a fixed wait (from the triage's `how` and the research `why_fuzzy`), where the repository's helpers are, and the one real exception (a delay that simulates slow work inside a fake). No case facts.

## Fixture

`relay-kit`, a dependency-free Bun/TypeScript package: `src/watcher.ts` (polling `FileWatcher`, `change` event), `src/queue.ts` (`JobQueue`, `drain`), `src/server.ts` (`createServer` over `Bun.serve`, `stop()` drains in-flight requests), `src/cache.ts` (`RefreshingCache`, injected `now`, `refresh` event), `src/duration.ts` (`parseDuration`, for the chore steps), `test/helpers.ts` (`once`, `waitFor`, `deferred`), existing compliant tests for queue, server, cache and duration, `README.md`, `CHANGELOG.md`, `package.json`, `.gitignore`. 10 tests pass as shipped with `bun test`; nothing to install. There is no watcher test (task 1 writes it). Planted for the chore steps: the `m: 6_000` minutes bug in `parseDuration`, the README saying `drained` (the event is `drain`), the README usage calling `server.close()` (the method is `stop()`), and the watcher option `interval` (renamed in task 3).

## Assertions (select glob `test/**/*.test.ts`)

1. `no-fixed-sleep`
   - grep: `[Ss]leep|setTimeout|setInterval|[Dd]elay|timers`
   - decide: "No test contains, in its own body, a pause for a fixed length of real time (such as await Bun.sleep(100) or an awaited setTimeout promise, whatever the delay) before it asserts or takes its next step. A pause does not count when it is inside a callback the test hands over as a fake job, handler or loader to stand in for slow work, inside a loop that re-checks a condition and gives up at a deadline, or run under fake timers. Every other pause counts, even when the same file also holds pauses that do not count."
2. `no-counted-ticks`
   - grep: `Promise\.resolve\(\)|setImmediate|nextTick|queueMicrotask`
   - decide: "No test awaits a fixed number of empty ticks (such as await Promise.resolve(), setImmediate, process.nextTick or queueMicrotask) to give asynchronous work time to finish before it asserts."

Only glob, grep and decide. A test file with none of the grep words passes without a model call, so in other entries' fixtures the Test selects only `test/**/*.test.ts` and is mostly free.

## Evals (19)

| eval                                  | expects | what it is                                                                                                                |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| shipped-suite                         | pass    | the fixture's own test files and helpers, unchanged                                                                       |
| careful-watcher-tests                 | pass    | task 1 done with `once` and `waitFor`                                                                                     |
| careless-watcher-tests                | fail    | task 1 done with `Bun.sleep(100)` or a setTimeout promise before asserting                                                |
| careful-server-stop-test              | pass    | task 3 with deferred promises; awaits the response and `stop()`                                                           |
| sleep-until-request-arrives           | fail    | task 3: the handler's sleep simulates slow work (allowed), but the test sleeps 20 ms "so the request reaches the handler" |
| slow-fake-jobs-then-awaited-drain     | pass    | task 2: jobs sleep to simulate work, the test awaits `drain`                                                              |
| sleep-then-check-queue-order          | fail    | task 2: one compliant test plus one with a 50 ms setTimeout promise before the assertion                                  |
| zero-delay-timeout-flush              | fail    | task 2: a `setTimeout(resolve, 0)` tick helper before asserting                                                           |
| careful-cache-with-injected-clock     | pass    | task 4 with the injected clock and an awaited `refresh`                                                                   |
| sleep-past-ttl                        | fail    | task 4: a 20 ms TTL and sleeps past it                                                                                    |
| counted-ticks-after-clock-advance     | fail    | task 4: clock injected, but three `await Promise.resolve()` and a setImmediate flush; only `no-counted-ticks` fails       |
| slow-fake-loader-then-awaited-refresh | pass    | the loader sleeps to simulate a slow upstream, the test awaits `refresh`                                                  |
| sleep-to-show-nothing-happens         | fail    | the positive test awaits the event; the "no event after unwatch" test sleeps 50 ms                                        |
| poll-loop-with-deadline               | pass    | a hand-written loop with `Bun.sleep(5)` that re-checks and throws at a deadline                                           |
| fake-timers-drive-the-timeout         | pass    | setTimeout only under `jest.useFakeTimers()` and `advanceTimersByTime`                                                    |
| resolved-promise-as-a-value           | pass    | a job returns `Promise.resolve()`; reaches `no-counted-ticks` and is benign                                               |
| unrelated-backoff-arithmetic          | pass    | a selected file about something else (pure `backoffDelay` arithmetic) that reaches the model through the word "delay"     |
| unrelated-invoice-totals              | pass    | a selected file about something else, cleared by grep alone                                                               |
| helpers-and-source-are-not-tests      | skip    | `test/helpers.ts` and `src/watcher.ts` (with setTimeout and setInterval) are not selected                                 |

Evals only `no-fixed-sleep` should fail: careless-watcher-tests, sleep-past-ttl, sleep-then-check-queue-order, sleep-until-request-arrives, sleep-to-show-nothing-happens, zero-delay-timeout-flush. Only `no-counted-ticks`: counted-ticks-after-clock-advance.

## Tempting tags

- 1: false. "Write tests for the file watcher: ..." only asks for the work.
- 2: false. "Add a test that the job queue processes every enqueued job in order." only asks for the work.
- 3: false. "Test that the server finishes in-flight requests when stop() is called." only asks for the work.
- 4: false. "Cache entries should be refreshed in the background after they expire. Add a test for that." only asks for the work.

All four `researched` prompts are word for word as researched. Each long prompt has four steps (87, 103, 89 and 99 words) with the researched one second. The other steps are a `parseDuration` or `formatDuration` change with a synchronous test, README fixes, an option rename, and `package.json` and `CHANGELOG.md` edits.

## Careless and careful

In a scratch copy of the fixture, for task 1 (the watcher):

- Careless: a listener pushing to an array, write the file, `await Bun.sleep(100)`, assert; plus "nothing happens" tests with a 100 ms sleep or setTimeout promise. The tests pass at run time (3 pass, 312 ms) and break the rule. This file is the `careless-watcher-tests` eval, which fails on both models.
- Careful: `once(watcher, 'change')` taken before the write and then awaited, and a second test with `waitFor`. It passes in about 30 ms.

I also wrote the careful version of tasks 2, 3 and 4 (deferred gates and an awaited `drain`; a handler held open with deferred promises and an awaited `stop()`; the injected clock and an awaited `refresh`). All 15 tests passed on three consecutive runs. These are the `careful-*` evals. I did not carry out the chore steps of any task; they are plain edits I checked against the fixture's files by reading.

## Proving rounds: 3

1. First proof, 17 evals: luna 16/17, jev 17/17. Luna passed `sleep-until-request-arrives`, where an allowed handler sleep sits beside a test-level sleep that is not allowed.
2. The Test was wrong. I reworded the `no-fixed-sleep` criterion to speak of a pause "in its own body", to list the three places that do not count, and to say every other pause counts even when the file also holds pauses that do not. luna 17/17, jev 17/17.
3. Added two evals for cases not yet covered (`sleep-to-show-nothing-happens`, fail; `slow-fake-loader-then-awaited-refresh`, pass), with no change to `test.yaml`. luna 19/19, jev 19/19. Frozen.

No eval was deleted, flipped or edited after it was written. In the last round there was no mismatch, refusal or error: 13 decision calls per model; luna 13749 input tokens, 0.0014 USD; jev 15091 input and 286 output tokens, 0.0006 USD. My three proof folders are deleted.

Last round's table, identical on luna and jev:

```
eval                                   expected  actual  match  decisions
careful-cache-with-injected-clock      pass      pass    yes    0
careful-server-stop-test               pass      pass    yes    0
careful-watcher-tests                  pass      pass    yes    0
careless-watcher-tests                 fail      fail    yes    1
counted-ticks-after-clock-advance      fail      fail    yes    1
fake-timers-drive-the-timeout          pass      pass    yes    1
helpers-and-source-are-not-tests       skip      skip    yes    0
poll-loop-with-deadline                pass      pass    yes    1
resolved-promise-as-a-value            pass      pass    yes    1
shipped-suite                          pass      pass    yes    0
sleep-past-ttl                         fail      fail    yes    1
sleep-then-check-queue-order           fail      fail    yes    1
sleep-to-show-nothing-happens          fail      fail    yes    1
sleep-until-request-arrives            fail      fail    yes    1
slow-fake-jobs-then-awaited-drain      pass      pass    yes    1
slow-fake-loader-then-awaited-refresh  pass      pass    yes    1
unrelated-backoff-arithmetic           pass      pass    yes    1
unrelated-invoice-totals               pass      pass    yes    0
zero-delay-timeout-flush               fail      fail    yes    1
```

## Changes to prompts or evals

None to a researched prompt or an eval. After the freeze I lengthened task 3's long prompt in `benchmark.yaml` (69 to 89 words: a README mention of the Bun version and a clause in the changelog step); nothing in `gate/` changed.

## Research and triage notes

- Nothing failed as written. The research fixture lists no pure module; I added `src/duration.ts` and its test so the chore steps have work outside the rule's subject, and a `deferred` helper beside `once` and `waitFor`.
- The research `grading_note` mentions raised test timeouts and the rule text does not. The rubric counts a timeout raised "so that sleeps fit" as a disguised wait; the Test has no assertion for it.
- Two readings of the rule are mine and the owner may want to confirm them: the exception for a delay that simulates slow work inside a fake (third bullet of the rule text), and that a sleep in a "nothing happens" test is a fixed wait (the gate fails it; the rubric calls a single one a minor lapse).

## Not expressed by the Test, and not verified

- The Test does not catch a busy loop on `Date.now()`, a raised test timeout, or a fixed loop of sleeps with no condition. The rubric names the first two.
- The clock clause is enforced only through `no-fixed-sleep`: a real sleep past a TTL fails, but there is no separate assertion that time-subject tests use the clock.
- No agent was run. Whether an untold agent sleeps in these tasks, whether the skill's description gets it loaded beside nine others, and how the Test behaves on other entries' real fixtures are unverified. The fake-timers eval file was never executed as a test.
- Verified: `loadEntry` passes; no skill placeholders; `validate` passes with the final `gate/` in a fresh copy of the fixture; the fixture's 10 tests pass and no cache is left; the rule text is absent from `fixture/`; `rubric.md` is 59 lines and `SKILL.md` 72.
- `git status` shows changes outside my folder (other dataset entries, `benchmarks/README.md`, `cli/`, `research/triage.yaml`); none are mine.
- One of my shell commands used a wildcard (`prove-2026-11-23T07-4*`) to delete proof folders. It was blocked before running, and I then deleted only my own three folders by exact name; other workers' proof folders were not touched.
