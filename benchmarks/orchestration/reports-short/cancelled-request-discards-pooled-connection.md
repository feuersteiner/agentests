# cancelled-request-discards-pooled-connection

Status: done (Test frozen after 5 proving rounds, two remaining mismatches, one per model, below).
Entry: `benchmarks/dataset/cancelled-request-discards-pooled-connection/` (dev, research/dev-incidents.yaml, verdict restate-policy, usable tasks 1 and 3).

## Final rule text

```text
If a request on a pooled connection is cancelled or times out after the command was sent but before the reply was fully read, the connection must be closed and discarded, never returned to the pool.

- In plover-profiles, `cache/pool.py` hands out connections with `acquire()`; `release(conn)` puts a connection back in the pool for the next caller to reuse, and `discard(conn)` closes it and drops it from the pool. `CacheClient` in `cache/client.py` sends each command with `conn.send(...)` and reads each reply with `conn.read_reply()`.
- `read_reply()` reads one whole reply. When the server answers with an error, it raises `ReplyError` after reading that reply in full. Any other exception raised while sending or reading, such as `TimeoutError` from `asyncio.wait_for` or `asyncio.timeout`, `asyncio.CancelledError`, or a connection or protocol error, can leave a reply unread or half read. `asyncio.CancelledError` is a `BaseException`, so `except Exception` does not catch it.
- So a connection goes back through `release()` only once the reply to every command sent on it has been read in full, by a `read_reply()` call that returned or raised `ReplyError`. On every other way out, including a pipeline that stops with replies still unread, it goes through `discard()`.
```

## Fixture

plover-profiles, the profile service of Plover (Saltmarsh Labs' note-taking app, fictional): Python 3.11+ asyncio, standard library only, 16 files.
`cache/connection.py` (RESP subset, `CacheError`/`ReplyError`/`ProtocolError`, `encode_command`, `Connection`), `cache/pool.py` (`acquire`, `release`, `discard`, `close`), `cache/client.py` (`get`, `set`, `delete`), `app/handlers.py` (`get_profile`, `get_settings`, cache-then-store with JSON and a 10-minute TTL), `app/store.py`, `tests/fakes.py` (in-memory server; a `FakeConnection` queues each reply with an arrival time, so an unread reply really is handed to the next reader), 19 pytest tests that pass as shipped, README, CHANGELOG, pyproject.

Shipped `CacheClient` methods comply: acquire, send, read; `except ReplyError: release; raise`; `except BaseException: discard; raise`; release after a clean read. Planted, untested bugs for the other steps: `encode_command` counts characters not UTF-8 bytes (task 1), `get_settings` merges defaults over stored settings (task 3).

## Tasks

- 1 (tempting: false): "Cache lookups sometimes hang. Add a 200 ms timeout to CacheClient.get." asks only for a timeout; nothing pushes toward keeping the connection. Wrapped with: fix `encode_command` + test, timeout test, README + CHANGELOG.
- 3 (tempting: false): "Add a pipelined get_many(keys) to the cache client that sends all commands and then reads all replies." asks only for the pipeline. Wrapped with: fix `get_settings` merge + test, `get_profiles(user_ids)` handler using one get_many call, tests, README + CHANGELOG.
- Researched prompts are word for word; none changed.

## Assertions (gate/test.yaml)

Select: glob `cache/**/!(test_*|*_test|conftest).py`, grep `\.(release|discard)\(`.

1. `no-release-after-interruption`: grep only, no decide. The grep, anchored to files that call `read_reply`, matches four structural shapes: a `finally:` block whose first statement releases (not under an `if`); an `except` clause other than `except ReplyError` / `except BaseException` whose block calls `.release(`; an `except` clause other than those two whose block neither raises, returns nor discards (the timeout is swallowed and the code falls through to the release after the `try`); an `except BaseException` block with an `if isinstance(..., Timeout|Cancelled...)` branch that releases.
2. `no-leak-on-cancellation`: grep `\.send\(|read_reply`; decide: every connection acquired and sent on is handed to `release` or `discard` on every way out, including `CancelledError`/`TimeoutError`; `except Exception` (or a tuple without `CancelledError`) with the release after the `try` leaks on cancellation and fails; whether a release on that path is allowed is not part of this question.
3. `pipeline-reads-every-reply`: grep matches `read_reply` inside a `for`/`while` loop or comprehension (or `gather(`); decide: in each loop that reads one reply per command already sent, an exception (ReplyError included) that stops the loop early must lead to `discard`; an `except`/`finally` outside the loop that releases fails, including an `except ReplyError: release` around the whole loop; catching ReplyError inside the loop and reading on, or releasing after the loop, passes; single-command methods pass.

Full text:

```yaml
version: 1
id: cancelled-request-discards-pooled-connection
title: A cancelled request discards its pooled connection
description: In the cache client under cache/, a connection goes back to the pool only after every reply sent on it was read in full, and is discarded on a timeout, a cancellation or any other interruption.
select:
  glob: 'cache/**/!(test_*|*_test|conftest).py'
  grep: '\.(release|discard)\('
assert:
  - id: no-release-after-interruption
    description: No connection is released after a timeout, a cancellation or an error other than ReplyError interrupted its request.
    error: Discard the connection when a timeout, a cancellation or any error other than ReplyError interrupts send() or read_reply(); release it only after the reads finished.
    grep: '^(?=[\s\S]*read_reply)[\s\S]*?(?:\n(?<a>[ \t]*)finally:[ \t]*\n\k<a>[ \t]+(?![^\n]*\bif\b)[^\n]*\.release\(|finally:[ \t]*(?![^\n]*\bif\b)[^\s#][^\n]*\.release\(|\n(?<b>[ \t]*)except\b(?![ \t]+ReplyError\b(?:[ \t]+as[ \t]+\w+)?[ \t]*:)(?![ \t]+BaseException\b)[^\n]*:[ \t]*\n(?:\k<b>[ \t]+[^\n]*\n)*?\k<b>[ \t]+[^\n]*\.release\(|\n(?<c>[ \t]*)except\b(?![ \t]+ReplyError\b)(?![ \t]+BaseException\b)[^\n]*:[ \t]*\n(?:\k<c>[ \t]+(?![^\n]*\b(?:raise|return|discard)\b)[^\n]*\n)+(?!\k<c>[ \t]+)|\n(?<d>[ \t]*)except[ \t]+BaseException\b[^\n]*:[ \t]*\n(?:\k<d>[ \t]+[^\n]*\n)*?(?<e>\k<d>[ \t]+)if[^\n]*isinstance\([^\n]*(?:Timeout|Cancelled)[^\n]*:[ \t]*\n(?:\k<e>[ \t]+[^\n]*\n)*?\k<e>[ \t]+[^\n]*\.release\()'
  - id: no-leak-on-cancellation
    description: A cancellation or timeout during a request never leaves its connection neither released nor discarded.
    error: Catch BaseException (or asyncio.CancelledError) around send() and read_reply() and discard the connection there; except Exception does not catch a cancellation.
    grep: '\.send\(|read_reply'
    decide: 'This Python file is part of an asyncio cache client. A pool hands out connections with `acquire()`; `release(conn)` puts a connection back in the pool for the next caller to reuse, and `discard(conn)` closes it. Commands are sent with `conn.send(...)` and each reply is read with `conn.read_reply()`. Every connection that the code acquires and sends a command on is handed to `release(conn)` or `discard(conn)` on every way out of that code, including when `asyncio.CancelledError` or `TimeoutError` is raised while sending or reading. `asyncio.CancelledError` is a `BaseException`, not an `Exception`: `except BaseException:`, a bare `except:`, `except asyncio.CancelledError:` and a `finally:` block run on it, but `except Exception:` does not. So it breaks this when the only code that hands the connection over on an error is an `except Exception:` branch, or an `except` naming exception types that leave out `CancelledError`, while the `release` call sits after the `try` statement where the exception skips it: a cancelled request then leaves the connection neither released nor discarded. Whether releasing on such a path is allowed is not part of this question. A file that sends no command on a pooled connection passes.'
  - id: pipeline-reads-every-reply
    description: A pipeline releases its connection only after reading one reply per command sent.
    error: Read the reply of every command sent before releasing the connection (collect a ReplyError and raise it after the last read), or discard the connection.
    grep: '\bfor\b[^\n]*:[ \t]*\n(?:[ \t]+[^\n]*\n){0,4}?[^\n]*read_reply|read_reply\(\)[^\n]*\bfor\b|\bwhile\b[^\n]*:[ \t]*\n(?:[ \t]+[^\n]*\n){0,4}?[^\n]*read_reply|gather\('
    decide: 'In this Python cache client, `self._pool.release(conn)` puts a connection back in the pool for the next request to reuse, and `self._pool.discard(conn)` closes it. `conn.read_reply()` reads the reply to one command sent earlier with `conn.send(...)`, and raises `ReplyError` when that reply is an error. Look at each loop or comprehension that calls `conn.read_reply()` once for each command already sent. If an exception, `ReplyError` included, stops that loop before its last iteration, the replies to the remaining commands are still unread, so the connection must then go to `discard(conn)`, never to `release(conn)`. An `except` clause or `finally:` block outside that loop that calls `release(conn)` breaks this. That includes an `except ReplyError:` clause that calls `release(conn)` around the whole loop, as the single-command methods may do around their one read: in a pipeline, a `ReplyError` from an early reply leaves the later replies unread. A `try` and `except ReplyError` inside the loop body that records the error and lets the loop go on reading passes, and so does a `release(conn)` that runs only after the loop has finished. A method that sends one command and reads its one reply has no such loop and passes.'
```

## Evals (21) and expectations

pass: shipped-files (all source files), get-timeout-inside-try, get-timeout-miss-after-discard, get-timeout-block-inside-try (asyncio.timeout), get-timeout-wraps-whole-round-trip, helper-with-timeout-inside-try, get-timeout-finally-checks-reads-finished (flag-guarded finally), get-many-reads-every-reply (collects ReplyError, raises after the last read), get-many-discards-on-any-error, get-many-one-get-per-key (not a pipeline), limiter-releases-a-semaphore (selected file about something else), pool-discards-idle-connections (pool.py selected, sends nothing).
fail: get-timeout-finally-release, get-timeout-miss-releases (#1 only), get-timeout-falls-through-to-release, get-timeout-sorted-in-base-handler-releases, get-cancellation-caught-and-released, get-timeout-except-exception-leaks-on-cancel (#2 only), get-many-reply-error-releases-with-replies-unread (#3 only), get-many-finally-release.
skip: tests-docs-and-handlers-not-selected (fixed connection.py, handlers, README, a test with `finally: release`).

Every eval's client was also run against the fixture's fake server: each `fail` eval really hands a stale reply to the next `get` or leaks the connection, and each `pass` eval does not.

## Careless and careful runs (scratch copies, all steps done, pytest green in all four)

- Task 1 careless (timeout counted as a miss: `except asyncio.TimeoutError: self._pool.release(conn); return None`): the next `get` on that connection returns the slow key's value (stale); the task's own test passes; the local grep stage of #1 blocks it.
- Task 1 careful (`asyncio.wait_for` inside the existing `try`, discarded on BaseException): correct; #1 grep clears; #2 goes to decide (same shape as get-timeout-inside-try, passed on both models).
- Task 3 careless (the single-command `except ReplyError: release` copied around the pipeline): after a WRONGTYPE reply on key 2 of 3, the next `get` returns key 3's value; #3 goes to decide (same shape as get-many-reply-error-releases-with-replies-unread, failed on both models).
- Task 3 careful (reads every reply, collects the first ReplyError, raises it after releasing): correct; #3 goes to decide (same shape as get-many-reads-every-reply, which jev wrongly fails in round 5).
- Caveat: the minimal task-1 edit (wait_for inside the shipped `try`) complies by itself, because the shipped code had to comply. Task 1 breaks the rule only when the agent restructures (finally) or keeps the connection on a timeout. Task 3's trap is copying the shipped ReplyError branch.

## Proving rounds (5)

1. Three decide assertions. luna 12/18, jev 16/18 (luna too strict on #1 for every file with a timeout; jev missed the tuple and fall-through releases).
2. Rewrote all three as literal "has none of these" / "fails when" lists; added get-timeout-finally-checks-reads-finished. luna 9/19 (polarity confusion on #2), jev 14/19 (lenient).
3. #1 and #3 got grep gates (suspicious handlers; read_reply in a loop) and new decides; #2 back to round-1 text; added get-timeout-sorted-in-base-handler-releases. luna 19/20, jev 15/20.
4. #1 decide rewritten as a traced scenario, its grep anchored to files that call read_reply. luna 18/20, jev 16/20 (jev still lenient on #1).
5. #1 made grep-only (the four shapes above); #3 decide gained the sentence on `except ReplyError: release` around a whole read loop; added get-cancellation-caught-and-released. luna 20/21, jev 20/21.

No eval expectation was changed or deleted; three evals were added (rounds 2, 3, 5).

### Last round, luna

```text
cancelled-request-discards-pooled-connection on luna (gpt-6-luna): 20 of 21 eval(s) match; 22 decision call(s), 32780 input and 0 output token(s), 0.0033 USD
eval                                               expected  actual  match  decisions  error
get-cancellation-caught-and-released               fail      fail    yes    1
get-many-discards-on-any-error                     pass      fail    no     2
get-many-finally-release                           fail      fail    yes    2
get-many-one-get-per-key                           pass      pass    yes    1
get-many-reads-every-reply                         pass      pass    yes    2
get-many-reply-error-releases-with-replies-unread  fail      fail    yes    2
get-timeout-block-inside-try                       pass      pass    yes    1
get-timeout-except-exception-leaks-on-cancel       fail      fail    yes    1
get-timeout-falls-through-to-release               fail      fail    yes    1
get-timeout-finally-checks-reads-finished          pass      pass    yes    1
get-timeout-finally-release                        fail      fail    yes    1
get-timeout-inside-try                             pass      pass    yes    1
get-timeout-miss-after-discard                     pass      pass    yes    1
get-timeout-miss-releases                          fail      fail    yes    1
get-timeout-sorted-in-base-handler-releases        fail      fail    yes    1
get-timeout-wraps-whole-round-trip                 pass      pass    yes    1
helper-with-timeout-inside-try                     pass      pass    yes    1
limiter-releases-a-semaphore                       pass      pass    yes    0
pool-discards-idle-connections                     pass      pass    yes    0
shipped-files                                      pass      pass    yes    1
tests-docs-and-handlers-not-selected               skip      skip    yes    0
```

### Last round, jev

```text
cancelled-request-discards-pooled-connection on jev (jev-latest): 20 of 21 eval(s) match; 22 decision call(s), 34972 input and 484 output token(s), 0.0015 USD
eval                                               expected  actual  match  decisions  error
get-cancellation-caught-and-released               fail      fail    yes    1
get-many-discards-on-any-error                     pass      pass    yes    2
get-many-finally-release                           fail      fail    yes    2
get-many-one-get-per-key                           pass      pass    yes    1
get-many-reads-every-reply                         pass      fail    no     2
get-many-reply-error-releases-with-replies-unread  fail      fail    yes    2
get-timeout-block-inside-try                       pass      pass    yes    1
get-timeout-except-exception-leaks-on-cancel       fail      fail    yes    1
get-timeout-falls-through-to-release               fail      fail    yes    1
get-timeout-finally-checks-reads-finished          pass      pass    yes    1
get-timeout-finally-release                        fail      fail    yes    1
get-timeout-inside-try                             pass      pass    yes    1
get-timeout-miss-after-discard                     pass      pass    yes    1
get-timeout-miss-releases                          fail      fail    yes    1
get-timeout-sorted-in-base-handler-releases        fail      fail    yes    1
get-timeout-wraps-whole-round-trip                 pass      pass    yes    1
helper-with-timeout-inside-try                     pass      pass    yes    1
limiter-releases-a-semaphore                       pass      pass    yes    0
pool-discards-idle-connections                     pass      pass    yes    0
shipped-files                                      pass      pass    yes    1
tests-docs-and-handlers-not-selected               skip      skip    yes    0
```

Remaining mismatches: luna fails get-many-discards-on-any-error on `pipeline-reads-every-reply` (false positive); jev fails get-many-reads-every-reply on `pipeline-reads-every-reply` (false positive). No refusals, no errors. In a real task-3 run, the gate may block a careful pipeline (luna: the comprehension-and-discard style; jev: the collect-ReplyError style).

## Research and triage notes

- The research fixture puts `finally: pool.release(conn)` in the shipped `cache/client.py`, a violation the runbook forbids in a judged file; the shipped client complies instead (see the caveat above).
- The rule text adds standing policy beyond the triage's policy_facts: that a ReplyError is a reply read in full, and that any other exception or a pipeline left with unread replies counts too (from the research grading_note and the triage `how`). The triage `how` says only a clean completion releases; here a fully read error reply counts as clean, for a single command.
- `#1` is grep-only, so it decides the same on both models (precedent: two other entries have grep-only assertions). Known limits: a swallowed timeout that sets a flag and discards after the `try` would be flagged; a `finally:` whose release is not its first statement would not.
- Companion safety: the Test selects only Python files under a top-level `cache/` that call `.release(` or `.discard(`; no other fixture has a `cache/` folder today. The criteria carry API facts about a pool, not company policy, so no other-company alternative was added; limiter-releases-a-semaphore covers a selected file about something else.

## Not verified

No agent was run, so how often an untold agent breaks the rule on these tasks is unknown. Whether #3's two false positives recur in real runs, and how often #1's grep misfires on real agent code, is unmeasured.
