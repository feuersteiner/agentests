# Report: elapsed-time-uses-monotonic-clock

**Status: done.** The entry is at `benchmarks/dataset/elapsed-time-uses-monotonic-clock/` and holds `benchmark.yaml`, `rubric.md`, `fixture/`, `skill/SKILL.md` and `gate/` (TEST.md, test.yaml and 29 evals). It ran five proving rounds. Round 5 matched fewer evals than round 4, so I put round 4's `test.yaml` back and proved it once more, as the brief says. That re-proof matched **luna 29/29, jev 29/29**, and that Test is now frozen.

## Final rule text

```
Durations, timeouts and rates must be computed from a monotonic clock (time.monotonic, performance.now, process.hrtime, Go's monotonic reading), never by subtracting wall-clock timestamps, and code that must use wall time cannot assume the difference is non-negative.

- A duration is any length of time the code works out from clock readings: how long a query took, a round-trip time, the time since an event, whether a timeout, cooldown or retry time has passed, how far a rate limit has refilled. In Python, both readings come from `time.monotonic()`, `time.monotonic_ns()` or `time.perf_counter()`.
- `time.time()`, `time.time_ns()`, `datetime.now()` and `datetime.utcnow()` read the wall clock, which jumps when NTP corrects it or a leap second is inserted. It is for timestamps that people or other systems read, such as the time in a log line or a stored record, and for comparing with a timestamp from outside the process, such as one read from a file. Code that subtracts wall-clock times clamps or checks the result instead of assuming it is zero or more.
- A measured time, or a value derived from one, used as a divisor, as a weight or as the bound of a random choice, such as `1 / rtt`, is guarded so that zero or a negative value cannot reach it, for example with `max(rtt, MIN_RTT_S)` or a check that it is above zero. `if rtt:` stops zero but not a negative value. Even a monotonic clock can measure zero.
```

- The verdict is as-is, so the first sentence is the research rule word for word.
- The third bullet carries the triage `how` and the research grading_note: values fed into weights or random choices are guarded against zero or negative.

## The fixture

The fixture is `edge-resolver`, the DNS forwarder of a fictional company, Pellmoor Hosting. It is Python 3.11 standard library only.

- **Package files:** `resolver/` holds config, message (DNS header and question parsing, error answers), upstreams, breaker, ratelimit, transport (UDP), querylog, forwarder and server.
- **Tests:** `tests/` holds pytest tests and fakes. 17 tests pass as shipped, and no cache is left behind.
- **Stubs:** the rate limiter and the breaker are stubs. `Upstream.srtt_s` is a stub field, always `None`, with the comment "not tracked yet". `choose()` takes the first upstream whose breaker allows it.
- **Clock readings:** the only clock reading in the fixture is the query log's `datetime.now(timezone.utc)` timestamp. That use is allowed, and it is a near miss for the gate.
- **No hints:** no file mentions monotonic, wall clock, leap seconds, NTP or `perf_counter`.
- **Bugs for the other steps:**
  - HTTPS and SVCB queries show as TYPE65 and TYPE64.
  - `load_settings` returns the port and the burst as strings.
  - IPv6 upstreams cannot be parsed.
  - Error answers drop RD and leave RA unset.
  - A truncated question raises IndexError or struct.error.
  - The README's Configuration table lacks the two rate-limit variables.

## Assertions (frozen test.yaml)

`select.glob: 'resolver/**/*.py'`, with no select grep. No other dataset fixture has a `resolver/` folder, so when this Test runs as a companion it selects nothing there.

### 1. `durations-use-monotonic-clock`

- **grep:** `'\btime\(\)|\btime\.time\b|\btime_ns\b|datetime|\bnow\(|utcnow'`
- **decide:** "This code may read the wall clock (time.time(), time.time_ns(), datetime.now() or datetime.utcnow()) in two cases only: for a timestamp that is formatted, logged, displayed or written into a record, a file or a message, even when it is kept in an attribute first; and to subtract it from or compare it with a timestamp read back from a file, a database or a message, even one an earlier run of the program wrote, since a monotonic reading means nothing after a restart. Every other length of time it works out from clock readings comes from a monotonic clock, time.monotonic(), time.monotonic_ns() or time.perf_counter(): how long something took, a round-trip time, an uptime, the time since an event in this run, whether a timeout, cooldown or retry time has passed, or how far a rate limit has refilled. It fails when such a length of time comes from the wall clock: two wall-clock readings of this run subtracted or compared; a wall-clock reading kept in a variable or attribute and later subtracted or compared, as in `self.opened_at = time.time()` and then `time.time() - self.opened_at`; a deadline set as a wall-clock reading plus a number; or a wall-clock reading or the time.time function handed to a rate limiter, breaker or timer."

### 2. `wall-clock-differences-not-assumed-non-negative`

- **grep:** the same as assertion 1.
- **decide:** "Every subtraction in this code that involves a wall-clock time (a reading of time.time(), time.time_ns(), datetime.now() or datetime.utcnow(), or a timestamp read from a file, a database or a message) has its result clamped, for example with max(0, ...), or checked for a negative value and handled, before the result is used in arithmetic, stored or returned. A result that is only compared with a limit, as in `if now - saved_at > max_age_s:`, passes. Code with no subtraction that involves a wall-clock time passes, including code that subtracts only readings of time.monotonic(), time.monotonic_ns() or time.perf_counter()."

### 3. `measured-times-guarded-before-division-or-weighting`

- **grep:** `'random|choices|[Ww]eight|WEIGHT|/\s*\(|/\s*[\w.]*([Rr]tt|RTT|[Ee]lapsed|ELAPSED|[Ll]atency|LATENCY|[Dd]uration|DURATION|[Ii]nterval|INTERVAL|_s\b|_ms\b|_ns\b)'`
- **decide:** "Wherever this code divides by a measured time or by a value taken from one (a round-trip time, a smoothed RTT, an elapsed time, an uptime, a latency or an interval: any difference of two clock readings, even of a monotonic clock, which can measure zero), or uses such a value as a weight or as the bound of a random choice, it makes sure the value is above zero with an explicit guard. A guard is max() with a positive minimum, either where the value is used, as in `1 / max(rtt, MIN_RTT)`, or every time the value is stored, as in `self.srtt = max(new_srtt, MIN_RTT)`; or a comparison such as `rtt > 0` that skips or replaces the value otherwise. These are not guards, because a negative value gets through them: a truthiness check such as `if rtt:` or `rtt or DEFAULT`, `rtt is not None`, `rtt != 0`, and a value that starts above zero and is then averaged with new measurements without any max() or comparison. It fails when such a value is divided by or used as a weight without a guard, for example `1 / upstream.srtt` or `count / uptime_s`. Code that never divides by a measured time and never uses one as a weight or random bound passes."

Careful code that reads only monotonic clocks never matches the greps of assertions 1 and 2, so it passes them at no cost.

## Evals (29)

| Eval                                            | Expect | What it shows                                                                                   |
| ----------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| breaker-careful-monotonic                       | pass   | Task 4 done the careful way                                                                     |
| breaker-careless-wall-clock                     | fail   | `opened_at = time.time()` and `time.time() - opened_at >= 30`                                   |
| breaker-wall-clock-deadline                     | fail   | `retry_at = datetime.now() + timedelta(30s)`; fails assertion 1 only                            |
| breaker-monotonic-with-wall-clock-for-display   | pass   | Monotonic reopen, plus a `datetime.now()` kept only for logs                                    |
| forwarder-passes-wall-clock-to-limiter          | fail   | `limiter.allow(client, now=time.time())`; fails assertion 1 only                                |
| querylog-epoch-timestamp-and-rtt                | pass   | `"ts": round(time.time(), 3)` and an `rtt_ms` field                                             |
| ratelimit-careful-monotonic                     | pass   | Task 2 done the careful way                                                                     |
| ratelimit-careless-time-time                    | fail   | Token bucket refilled from `time.time()` differences                                            |
| ratelimit-careless-datetime                     | fail   | Token bucket using `(datetime.now() - refilled_at).total_seconds()`                             |
| ratelimit-injected-clock-defaults-to-wall-clock | fail   | `clock=time.time` as the default                                                                |
| ratelimit-injected-clock-defaults-to-monotonic  | pass   | `clock=time.monotonic` as the default                                                           |
| rtt-careful-monotonic-ewma                      | pass   | Task 1 done the careful way; the file has the word "weight" in a comment but divides by nothing |
| rtt-careless-wall-clock                         | fail   | Task 1 done the careless way                                                                    |
| rtt-wall-clock-clamped-at-zero                  | fail   | `max(0.0, time.time() - start)`; fails assertion 1 only                                         |
| saved-rtts-age-from-file-unclamped              | fail   | Age of a file timestamp, unclamped and fed into decay arithmetic; fails assertion 2 only        |
| saved-rtts-age-from-file-clamped                | pass   | The same file with the age clamped                                                              |
| shipped-resolver-files                          | pass   | The fixture's own `resolver/` files, unchanged                                                  |
| stats-rate-divides-by-unguarded-uptime          | fail   | `queries / uptime_s` with a monotonic uptime; fails assertion 3 only                            |
| stats-started-at-timestamp                      | pass   | `datetime.now()` kept in attributes, used only in isoformat stats                               |
| task3-done-carelessly                           | fail   | My scratch run of task 3 done the careless way                                                  |
| task3-done-carefully                            | pass   | My scratch run of task 3 done the careful way                                                   |
| tests-and-readme-are-not-selected               | skip   | Tests, fakes and the README                                                                     |
| transport-random-query-id                       | pass   | Selected, but about something else: random query ids                                            |
| weighted-choice-careful                         | pass   | `1 / max(srtt or default, MIN)`                                                                 |
| weighted-choice-floor-when-stored               | pass   | The floor is applied when the RTT is stored                                                     |
| weighted-choice-max-over-or-default             | pass   | `max(u.srtt_s or INITIAL, MIN)`                                                                 |
| weighted-choice-unguarded                       | fail   | Only an `is not None` default; fails assertion 3 only                                           |
| weighted-choice-truthiness-check-only           | fail   | `1/srtt if srtt else ...`; fails assertion 3 only                                               |
| weighted-choice-positive-start-without-guard    | fail   | The value starts above zero and is averaged, with no floor; fails assertion 3 only              |

Each assertion has at least one eval that only it fails:

- **Assertion 1:** rtt-wall-clock-clamped-at-zero, breaker-wall-clock-deadline, forwarder-passes-wall-clock-to-limiter.
- **Assertion 2:** saved-rtts-age-from-file-unclamped.
- **Assertion 3:** the weighted-choice fails and stats-rate-divides-by-unguarded-uptime.

No company standing policy appears in any criterion, so I added no eval with another company's file.

## Tempting tags

All four are `false`:

- **Task 1** ("Track how long each upstream query takes...") only asks for the measurement.
- **Task 2** ("Implement a token-bucket rate limiter...") only asks for the limiter.
- **Task 3** ("Choose upstreams at random, weighted by 1/RTT") names the formula. That gives the agent the chance to divide by zero, but nothing in it pushes the agent to skip a guard.
- **Task 4** ("Add a circuit breaker... tries again after 30 seconds") is neutral.

The other steps of each prompt are chores in tests, the README, the changelog, `message.py`, `config.py` or `parse_upstream`. None of them adds any time arithmetic.

## Careless and careful runs (task 3, in a scratch copy)

- **Careless:** I wrote what an untold agent would.
  - The forwarder reads `start = time.time()` and passes `time.time() - start` to `record_success`.
  - `choose()` weights with `1.0 / u.srtt_s if u.srtt_s else 1.0 / DEFAULT_RTT`.
  - This breaks the rule twice: the RTT comes from the wall clock, and the weight is guarded only by a truthiness check.
  - The tests pass: 18 passed, on five runs.
- **Careful:** I used `time.monotonic()` around the query, and `weight()` returns `1 / max(srtt-or-INITIAL, MIN_RTT_S)`. The tests pass.

Both diffs became evals (`task3-done-carelessly`, `task3-done-carefully`), and both match on both models in the final re-proof.

While doing this run I found that a random `choose()` breaks the forwarder tests, which assumed the first upstream. I changed the fixture's `conftest.py` and `test_forwarder.py` so the forwarder tests use a one-upstream pool. The fixture's behaviour did not change.

## Proving rounds

1. **Initial Test.** luna 23/25, jev 22/25.
   - saved-rtts-age-from-file-clamped failed assertion 1 on both models: a file timestamp was not recognised as allowed.
   - stats-rate-divides-by-unguarded-uptime passed on luna.
   - stats-started-at-timestamp failed assertion 1 on jev.
   - weighted-choice-truthiness-check-only passed on jev.
2. **Changes:**
   - Assertion 1 now separates a reading kept in a variable and later subtracted from one that is only formatted, and states the exception for file timestamps.
   - Assertion 3 now names uptime and lists the checks that are not guards.

   **Result:** luna 24/25 (weighted-choice-floor-when-stored failed assertion 3), jev 24/25 (saved-rtts-age-from-file-clamped failed assertion 1).

3. **Changes:**
   - Assertion 1 now lists the two allowed wall-clock uses first.
   - Assertion 3 gives a storage-floor example, and says "averaged without any max() or comparison".
   - Eval fix: in weighted-choice-positive-start-without-guard and weighted-choice-floor-when-stored, the `srtt_s: float | None = INITIAL_RTT_S` type hint became `srtt_s: float = INITIAL_RTT_S`. The `None` in the hint made `1 / srtt` look breakable for a reason the rule is not about, so the files did not show what their names say. Neither expectation changed.

   **Result:** luna 25/25, jev 25/25.

4. **No Test change.** I added four evals: task3-done-carelessly, task3-done-carefully, weighted-choice-max-over-or-default and breaker-monotonic-with-wall-clock-for-display.

   **Result:** luna 29/29, jev 28/29 (task3-done-carefully failed assertion 3 on jev).

5. **Change:** assertion 3 reworded to judge the guard at each place, with "a default-picking check is fine before max()".

   **Result:** luna 28/29 (rtt-careful-monotonic-ewma failed assertion 3), jev 28/29 (task3-done-carefully). That is 56 matches against 57 in round 4.

   **Restore:** I put round 4's `test.yaml` back (it is identical to round 3's) and proved it once more on the same 29 evals. Result: **luna 29/29, jev 29/29**. That Test is frozen.

Copies of each round's `test.yaml` are in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/elapsed-time-uses-monotonic-clock/rounds/`.

### Last proof (frozen Test)

```
elapsed-time-uses-monotonic-clock on luna (gpt-6-luna): 29 of 29 eval(s) match; 43 decision call(s), 59300 input and 0 output token(s), 0.0059 USD
breaker-careful-monotonic                        pass      pass    yes    0
breaker-careless-wall-clock                      fail      fail    yes    2
breaker-monotonic-with-wall-clock-for-display    pass      pass    yes    2
breaker-wall-clock-deadline                      fail      fail    yes    2
forwarder-passes-wall-clock-to-limiter           fail      fail    yes    2
querylog-epoch-timestamp-and-rtt                 pass      pass    yes    2
ratelimit-careful-monotonic                      pass      pass    yes    0
ratelimit-careless-datetime                      fail      fail    yes    2
ratelimit-careless-time-time                     fail      fail    yes    2
ratelimit-injected-clock-defaults-to-monotonic   pass      pass    yes    0
ratelimit-injected-clock-defaults-to-wall-clock  fail      fail    yes    2
rtt-careful-monotonic-ewma                       pass      pass    yes    1
rtt-careless-wall-clock                          fail      fail    yes    3
rtt-wall-clock-clamped-at-zero                   fail      fail    yes    3
saved-rtts-age-from-file-clamped                 pass      pass    yes    2
saved-rtts-age-from-file-unclamped               fail      fail    yes    2
shipped-resolver-files                           pass      pass    yes    2
stats-rate-divides-by-unguarded-uptime           fail      fail    yes    1
stats-started-at-timestamp                       pass      pass    yes    2
task3-done-carefully                             pass      pass    yes    1
task3-done-carelessly                            fail      fail    yes    3
tests-and-readme-are-not-selected                skip      skip    yes    0
transport-random-query-id                        pass      pass    yes    1
weighted-choice-careful                          pass      pass    yes    1
weighted-choice-floor-when-stored                pass      pass    yes    1
weighted-choice-max-over-or-default              pass      pass    yes    1
weighted-choice-positive-start-without-guard     fail      fail    yes    1
weighted-choice-truthiness-check-only            fail      fail    yes    1
weighted-choice-unguarded                        fail      fail    yes    1

elapsed-time-uses-monotonic-clock on jev (jev-latest): 29 of 29 eval(s) match; 43 decision call(s), 64481 input and 946 output token(s), 0.0027 USD
(same 29 rows, every one a match)
```

There are no mismatches, refusals or errors in the last proof. All proof folders are deleted.

### Model behaviour seen across runs

- **Jev flipped on one eval.** With the same `test.yaml`, jev's verdict on task3-done-carefully flipped between runs: it failed in round 4 and passed in the re-proof. Assertion 3 is the least stable criterion.
- **Jev applies assertion 2 unevenly.** On the wall-clock token buckets, jev sometimes passes assertion 2. It never changes an outcome, because assertion 1 fails those files.

## Changes to research, prompts and evals

- **Researched prompts:** used word for word.
- **Triage `how`:** it says `resolver/*.py`. I used `resolver/**/*.py`.
- **Research grading_note:** it scores "monotonic everywhere but no guard on derived weights" as a 3 of 4. Because the guard is in the rule text here, the rubric puts that case at 4 to 6.
- **Task 3 depends on RTTs the fixture does not measure.** `srtt_s` is a stub, as the research fixture says, so an agent doing task 3 may also add the measurement. Either way, the rule applies.

## Verification

- `loadEntry` passes.
- `validate` passes with `gate/` installed in a fresh copy of the fixture.
- The rule text is word for word in the skill, `TEST.md` and the rubric, and is not in the fixture.
- The fixture's tests pass and leave no caches.
- `git status` shows only the new entry folder.
- The skill is 68 lines and has no `$` amounts. The rubric is 59 lines.

## What I could not verify

- **No agent run:** I ran no agent and no `agentests run`.
- **One task only:** I did only task 3 both ways, by hand.
- **Companion behaviour:** I inferred that, as a companion, this Test skips the files of other fixtures, because no other fixture has a `resolver/` folder; I did not run it there.
- **Fewer companions:** other dev Tests with broad Python globs (for example `**/*.py`) select this fixture's files, so they cannot be companions for these tests.
- **Proof folders:** once, a listing command in my loop picked another worker's newer proof folder by mistake. It failed to read anything there, and I stopped it. I changed and deleted nothing outside my own proof folders.
