# tigerbeetle-units-last-in-names: entry report

Status: done. No draft existed when I started (no `benchmarks/dataset/tigerbeetle-units-last-in-names/`, no scratch folder), so the entry was built from scratch. Five proving rounds (the limit); the Test and evals are frozen. Last round: luna 18/19, jev 18/19.

## Final rule text

Names of quantities carry their unit or qualifier, placed last in order of descending significance (for example `latency_ms_max`, `upload_timeout_s`), rather than bare names such as `timeout` or prefix forms such as `max_latency_ms`.

- A quantity is a length of time, a deadline or clock reading, an amount of data, a rate or a count. The rule covers every name the code defines for one, or for a list of them: variables, constants, parameters, attributes and fields. Indexes, identifiers, codes, flags, text and raw data are not quantities, and a name a library defines, such as the `timeout` keyword of `urlopen`, is not the code's own.
- A unit is a short suffix such as `_ms`, `_s`, `_bytes` or `_per_s`, and a count's unit is the thing counted (`chunks`, `retries_max`). A ratio or multiplier needs no unit. A unit given only in a comment is not in the name.
- A name starts with what is measured, then the unit, then any qualifier such as `max`, `min`, `avg`, `total` or `initial`: `retry_delay_ms_max`, not `max_retry_delay_ms` or `retry_delay_max_ms`.

The first sentence is the research rule word for word. The verdict is `as-is` (no policy_facts). The bullets are standing policy that scopes the rule: what counts as a quantity, how counts, ratios and comments are treated, and the noun-unit-qualifier order the source's `latency_ms_max` example shows. They hold no case facts.

## Assertions (select glob `uploader/**/*.py`, no select grep)

Each grep finds a _candidate_ violation. The first two find an identifier with a quantity word but no unit segment (`_s`, `_ms`, `_bytes`, `_mib`, `_per_s`, ...) in a definition position (`=` or `: type`), with ratios and multipliers left out. The third finds a qualifier that is not the last word. The decide then confirms whether the candidate holds a quantity. Full patterns are in `gate/test.yaml`.

1. `time-names-carry-a-unit`. Grep: as above, with the words timeout, delay, deadline, duration, elapsed, latency, interval, wait, start, time, ttl, now, last, slowest, fastest, longest, shortest. Decide: "Every variable, parameter, attribute, property or field in this code that holds a number of seconds or milliseconds has a time unit such as `_s` or `_ms` in its name, as `upload_timeout_s`, `retry_delay_ms_max` and `latencies_ms` do. This includes durations, timeouts, delays, deadlines, lists of durations, and times read from a clock such as `time.monotonic()` or a `clock()` function. A name such as `timeout`, `delay` or `elapsed` has no unit and breaks this, even when a comment gives the unit. Names for text, flags, objects or errors, and keyword arguments of library calls such as `timeout=` of `urlopen`, are not covered."
2. `size-rate-and-count-names-carry-a-unit`. Grep: as above, with size, length, rate, limit (not limiter or limiting), capacity and count, or a whole-token bare qualifier (total, average, avg, mean, peak, max, min, ...). Decide: "Every variable, parameter, attribute, property or field in this code that holds a size, a rate or a count says its unit in its name: a size has a size unit such as `_bytes`, a rate a per-second unit such as `_per_s`, and a count the thing it counts, as `chunk_bytes`, `messages_per_s`, `chunks` and `retries_max` do. A name such as `size`, `rate`, `limit` or `max` says no unit and breaks this, even when a comment gives the unit. Names for text, flags, objects, lists of records or identifiers are not covered."
3. `qualifiers-come-last`. Grep: `(?<![A-Za-z0-9])(?:max|MAX|min|...|slowest|average|initial|total|...)_[A-Za-z0-9]` (a qualifier that starts a word segment and is followed by more of the name). Decide: "No name that this code defines for a number starts with a qualifier such as max, min, avg, total, initial, slowest or average, or puts one ahead of its unit, as `max_latency_ms`, `MAX_RETRIES` and `retry_delay_max_ms` do. Names that end with the qualifier, such as `latency_ms_max`, `retry_delay_ms_max` and `retries_max`, are fine, and so are names that hold text, flags, objects or identifiers."

## Evals (19)

| Eval                                              | Expect | What it is                                                                                                    |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| shipped-uploader-files                            | pass   | the fixture's six `uploader/*.py` unchanged (transport's `timeout=` keyword reaches decide 1)                 |
| tests-and-scripts-are-not-selected                | skip   | `tests/test_ratelimit.py` and `scripts/bench_upload.py` full of bare names, plus README                       |
| object-keys-module-about-something-else           | pass   | selected `uploader/keys.py` (object keys, `BASE_PREFIX`), no quantities                                       |
| counts-name-what-they-count                       | pass   | report.py with `file_count`, `retry_count` (near miss for 2)                                                  |
| text-and-error-names-with-time-or-qualifier-words | pass   | cli.py with `start_message`, `last_error`, `total_line` (near miss for 1 and 3)                               |
| rate-limit-careless-bare-names                    | fail   | task 1 careless: `rate`, `burst`, `last`, `now`, `wait`, `max_requests_per_second`, `max_burst`               |
| rate-limit-careful-units-last                     | pass   | task 1 careful: `requests_per_s_max`, `requests_burst_max`, `tokens`, `refilled_s`, `wait_s`                  |
| rate-limit-bare-rate-and-burst                    | fail   | `rate`, `burst`, time names right (2 only)                                                                    |
| timeout-careless-bare-and-prefixed                | fail   | task 2 careless (from the scratch run): `upload_timeout` + comment, `max_file_size`, `start`, `elapsed`       |
| timeout-careful-units-last                        | pass   | task 2 careful (from the scratch run): `upload_timeout_s`, `file_bytes_max`, `deadline_s`                     |
| timeout-unit-only-in-a-comment                    | fail   | `upload_timeout: float = 120.0  # seconds` (1 only)                                                           |
| file-size-without-a-unit                          | fail   | `size = path.stat().st_size` in a helper (2 only)                                                             |
| timeout-qualifier-before-the-name                 | fail   | `max_file_bytes` with `upload_timeout_s` (3 only)                                                             |
| chunk-timing-careless                             | fail   | task 3 careless (from the scratch run): `chunk_times`, `start`, `slowest_chunk`, `average_chunk`, `times`     |
| chunk-timing-careful                              | pass   | task 3 careful (from the scratch run): `chunk_durations_ms`, `chunk_duration_ms_max`, `chunk_duration_ms_avg` |
| chunk-timing-qualifier-before-the-unit            | fail   | `chunk_duration_max_ms`, `chunk_duration_avg_ms` (3 only)                                                     |
| backoff-careless-bare-and-prefixed                | fail   | task 4 careless: `initial_delay`, `max_delay`, `backoff_multiplier`, `delay`                                  |
| backoff-careful-units-last                        | pass   | task 4 careful: `retry_delay_ms_initial`, `retry_delay_multiplier`, `retry_delay_ms_max`                      |
| backoff-initial-qualifier-first                   | fail   | `initial_retry_delay_ms` with units (3 only)                                                                  |

## Tempting tags

- 1: false. "At most 20 requests per second, with bursts of up to 50" only names the work.
- 2: false. "Abort uploads ... reject files larger than 5 GB" only names the work. The prompt's units (minutes, GB) differ from the code's, but nothing pushes toward a bare name.
- 3: false. "Show the slowest and the average" names what to show; it does not ask for names.
- 4: false, and the closest to tempting of the four. "Initial delay, multiplier and maximum delay" lists the settings in English, qualifier-first order, which an agent may copy into `initial_delay` and `max_delay`. That is phrasing, not pressure to break the rule; the orchestrator may prefer `true`.

## Careless and careful (all four steps of tasks 2 and 3, in scratch copies)

- Task 2 careless: README version fixed; `UploadError` messages prefixed with the file name; `upload_timeout: float = 120.0` and `max_file_size` in `Config` with the units in comments; `start`, `elapsed` in the client; changelog lines. 10 tests pass. It breaks the rule; it is the eval `timeout-careless-bare-and-prefixed`, which fails on both models.
- Task 2 careful: the same steps, with `upload_timeout_s`, `file_bytes_max` and `deadline_s`. 10 tests pass; it is `timeout-careful-units-last`, which passes on both models.
- Task 3 careless: `Content-Type` header with a test; `chunk_times`, `start`, `slowest_chunk`, `average_chunk`; README sample and changelog updated. 10 tests pass; the eval `chunk-timing-careless` fails on both models.
- Task 3 careful: `chunk_started_s`, `chunk_durations_ms`, `chunk_duration_ms_max`, `chunk_duration_ms_avg`. 10 tests pass; `chunk-timing-careful` passes on both models.
- Tasks 1 and 4: the rule step only was written (as eval files), and each version runs green with the fixture's tests in a scratch copy (the rate limiter versions with an extra burst test).

## Proving rounds (5)

1. Broad greps (any time word, no grep for amounts, any qualifier word including `base` and `limit`) and long "Every name ..." criteria: luna 12/17, jev 12/17. Every miss was a compliant file failing: the shipped files and all four careful evals.
2. Shorter criteria; assertion 2 narrowed to sizes, rates and maximum counts; `base` dropped. Result: luna 11/17, failing even `keys.py`, which holds no quantity; jev 14/17. Compliant files still failed.
3. The greps narrowed to candidate violations (above), criteria in "No ..." form, and assertion 2 back to every count. Added two pass evals, `counts-name-what-they-count` and `text-and-error-names-with-time-or-qualifier-words`, because compliant files no longer reached a decide. Result: luna 18/19, jev 16/19. Jev passed `chunk-timing-careless` and `file-size-without-a-unit`; both models failed the counts eval.
4. All three criteria in positive "Every ..." form; `chunks` (from the rule text) added to the count examples; clock readings, lists and properties named in criterion 1. Result: luna 17/19, jev 17/19. Criterion 3 got weaker: both models passed `backoff-initial-qualifier-first`, jev passed `timeout-qualifier-before-the-name`, and luna still failed the counts eval.
5. Criteria 1 and 2 as in round 4 (criterion 2 also lists "lists of records" as not covered); criterion 3 back to its round-3 "No ..." wording. Result: luna 18/19, jev 18/19.

No eval was changed, flipped or deleted; two were added in round 3. `TEST.md` never changed.

### Last round tables

luna (gpt-6-luna): 18 of 19 match; 29 decision calls, 35386 input and 0 output tokens, 0.0035 USD

| eval                                              | expected | actual | match |
| ------------------------------------------------- | -------- | ------ | ----- |
| backoff-careful-units-last                        | pass     | pass   | yes   |
| backoff-careless-bare-and-prefixed                | fail     | fail   | yes   |
| backoff-initial-qualifier-first                   | fail     | fail   | yes   |
| chunk-timing-careful                              | pass     | pass   | yes   |
| chunk-timing-careless                             | fail     | fail   | yes   |
| chunk-timing-qualifier-before-the-unit            | fail     | fail   | yes   |
| counts-name-what-they-count                       | pass     | fail   | no    |
| file-size-without-a-unit                          | fail     | fail   | yes   |
| object-keys-module-about-something-else           | pass     | pass   | yes   |
| rate-limit-bare-rate-and-burst                    | fail     | fail   | yes   |
| rate-limit-careful-units-last                     | pass     | pass   | yes   |
| rate-limit-careless-bare-names                    | fail     | fail   | yes   |
| shipped-uploader-files                            | pass     | pass   | yes   |
| tests-and-scripts-are-not-selected                | skip     | skip   | yes   |
| text-and-error-names-with-time-or-qualifier-words | pass     | pass   | yes   |
| timeout-careful-units-last                        | pass     | pass   | yes   |
| timeout-careless-bare-and-prefixed                | fail     | fail   | yes   |
| timeout-qualifier-before-the-name                 | fail     | fail   | yes   |
| timeout-unit-only-in-a-comment                    | fail     | fail   | yes   |

jev (jev-latest): 18 of 19 match; 29 decision calls, 38693 input and 638 output tokens, 0.0016 USD. Same table: every eval matches except `counts-name-what-they-count` (expected pass, got fail).

Remaining mismatch: `counts-name-what-they-count` fails `size-rate-and-count-names-carry-a-unit` on `uploader/report.py` on both models. Luna has failed `report.py` on this question in every round, including the unchanged shipped `report.py` in rounds 1 and 2, when no grep gated it. So something in the shipped file's content trips it: perhaps the `files` list, the `chunks`/`retries` fields or the `_UNIT_BYTES` table. Jev passed it in round 4 only. By the rule text (`chunks` is the rule's own example of a count name), the eval is right. No refusals and no errors in any round. All five proof folders are deleted (a `prove-2026-11-23T08-17-30-787Z` folder that appeared during my last round belongs to another worker and was left alone).

## Changed prompts or evals

- No researched prompt changed; all four are word for word.
- No eval changed. Two pass evals were added in round 3 (above).
- After freezing, tasks 3 and 4's wrappers were lengthened (78 and 71 words to 87 and 93), and the rubric trimmed to 59 lines. `gate/` was not touched.

## What did not work as written in the research or triage

- The research fixture lists `uploader/config.py`, `client.py` and `report.py`. The fixture puts the settings in a frozen `Config` dataclass with the research's own names (`chunk_bytes`, `request_timeout_s`, `retry_delay_ms_max`) and adds `transport.py` (a urllib transport, so the tests use an in-process fake Depot and a fake clock with no network) and `cli.py`.
- The triage's `how` asks for "every name holding a quantity". A decision model judging every name of a whole file was unreliable: compliant files failed widely in rounds 1 and 2. The final Test leans on greps that find candidate names, with the decide confirming. Consequences, which the judge still covers:
  - Bare names outside the grep vocabulary are not caught, for example `abort_after = 120`, `budget = 120` or `burst = 50` (`burst` was taken out of the vocabulary, as too close to one task's wording).
  - Names defined only as a `def` (a property) are caught only by the qualifier grep.
  - Plain counts reach the decide only through the words `count`, `size`, `rate` and so on.
- The verdict is `as-is`, but the rule still needed scoping bullets (indexes, codes, text, library keywords, ratios, units in comments) for a careful file to pass reliably.

## Verification

- `loadEntry` passes; there are no skill placeholders. `validate` passes with the final `gate/` installed in a fresh copy of the fixture.
- The rule text is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and none of it appears in `fixture/`.
- The fixture's tests pass as shipped (8), and no cache is left in the entry.
- The rubric is 59 lines and the skill 73. The prompts are 91, 95, 87 and 93 words, each with four steps, and the researched step is never first.
- Only `benchmarks/dataset/tigerbeetle-units-last-in-names/` is new from this worker.

## Not verified

- No agent was run. So it is untested whether an untold agent really writes the careless forms: the fixture's `request_timeout_s` and `retry_delay_ms_max` may steer it to units but English qualifier order. Also untested: whether the skill is chosen from its description among nine others, and how the Test behaves in real runs. In other fixtures it should skip everything, because no other entry has an `uploader/` folder.
- One risk: a careful agent edit to `report.py` that defines a name containing `count`, `size`, `rate` or a bare qualifier would reach decide 2, where both models have failed that file. The careful task-3 output (`chunk-timing-careful`) does not trigger that grep.
- Decision answers moved with wording from round to round, so single-round match counts may not be stable.
