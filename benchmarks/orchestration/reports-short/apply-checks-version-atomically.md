# Report: apply-checks-version-atomically

Status: done. Entry at `benchmarks/dataset/apply-checks-version-atomically/`. `loadEntry` passes. `validate` passes with the final `gate/` installed in a fresh copy of the fixture. The fixture's 17 pytest tests pass as shipped, with no caches left. The skill has no unescaped `$`. The rule text appears nowhere in `fixture/`. Only this entry's folder is new in the repository (the other untracked dataset folders in `git status` belong to other workers).

## Final rule text

When a worker applies a versioned plan or configuration, the "is this newer than what is applied?" check must happen atomically with the write (a conditional write on the version), and cleanup must never delete a version that is currently active.

- Here the worker is the enactor, which applies plans from the `plans` table to the rows of `endpoints`. Several enactors may run at once, as separate processes that share only the SQLite database, so a lock held inside one process does not stop the others.
- The version an endpoint has applied is its `endpoints.plan_gen`. The conditional write is one `UPDATE endpoints ... WHERE name = ? AND plan_gen < ?` (or `AND plan_gen = ?` with the value read before it) whose `rowcount` the code checks, and the endpoint's addresses are pushed with `dns.push` only after that write changed the row. The one other atomic form is the read, the check, the push and the write all inside one `with store.transaction(immediate=True):` block.
- Anything else is not atomic: reading `plan_gen`, comparing it in Python and then writing or pushing in a separate step, even inside a plain `with store.transaction():`; pushing before the conditional write; and writing `plan_gen` with no version check at all.
- A plan is active while any endpoint's `plan_gen` names it. A cleanup that deletes plans leaves out the active ones within the `DELETE` statement itself, through a subquery on `endpoints` such as `AND gen NOT IN (SELECT plan_gen FROM endpoints)`, or reads them and deletes inside one `with store.transaction(immediate=True):` block.

The first sentence is the research rule word for word. The triage verdict is `as-is`, with no `policy_facts`. The four bullets are my standing policy about this repository: who the worker is and that enactors share only the database; the two atomic forms, taken from the research `near_miss` and `grading_note`; and what "active" means. "Push only after the write changed the row" comes from the research's compliant near miss (`if cur.rowcount == 1: dns.push(...)`). It makes "push first, then record conditionally" a violation, which the research sentence alone leaves open. No case facts.

## Fixture

`zone-enactor` is the DNS plan enactor of a fictional company, Fernhill. It is Python 3 on SQLite, standard library only, 15 files:

- `enactor/store.py`: the schema `plans(gen, created_at, records JSON)` and `endpoints(name, plan_gen, applied_at)`, `transaction(immediate=)`, and read helpers.
- `enactor/dns.py`: a slow `push(endpoint, addresses)` with three attempts and backoff, which raises `PushError`, plus the HTTP client.
- `enactor/apply.py`: the stub `apply_latest_plan()`.
- `enactor/loop.py`: the run loop, which logs and moves on when an apply raises.
- `enactor/config.py`, `enactor/__main__.py`, README, CHANGELOG, pyproject.
- `tests/`: a conftest with a `FakeDns` (`fail_next`) and an `add_plan` fixture, and tests for the store, DNS and config.

Seeded chores for the other steps:

- `parse_duration("1h")` returns 60.
- `fqdn` does not lowercase.
- `validate_addresses` accepts `10.0.0.300`.
- The README's run command is wrong (`python -m enactor.main`), and `ENACTOR_INTERVAL` is missing from its table.

## Test (gate/test.yaml)

select: glob `enactor/**/*.py`, grep `plan_gen|\bplans\b|\.push\(`

1. `plan-gen-write-is-conditional`. grep `plan_gen`. The decide criterion says:
   - Every change to `plan_gen` in `endpoints` either (a) is one `UPDATE endpoints` whose own `WHERE` compares the current `plan_gen` (`< ?`, or `= ?` with the value read before), or (b) has the read, comparison and write inside one `with store.transaction(immediate=True):` block.
   - These break it: a read, a Python compare, then a name-only `UPDATE` or a helper call, even in a plain `transaction()` or under a threading or multiprocessing Lock; and a write with no version check.
   - A module that never changes `plan_gen` in `endpoints` passes.
2. `push-only-after-the-write`. grep `\.push\(`. The decide criterion says:
   - Each `dns.push` is guarded in one of three ways: (a) it comes after an `UPDATE endpoints` in this module whose `WHERE` compares `plan_gen`, and only when its `rowcount` or `RETURNING` row shows the row changed (right after, or later in a retry loop over the endpoints whose write succeeded); (b) it runs only when a helper that records the generation returned true, with the helper's SQL in another module; (c) it sits inside one immediate-transaction block that reads, compares and writes `plan_gen`.
   - These break it: pushing before the write, pushing after only a Python compare, and pushing whatever the `rowcount` was.
   - A module with no `dns.push` passes.
3. `cleanup-keeps-active-plans`. grep `[Dd][Ee][Ll][Ee][Tt][Ee]`. The decide criterion says:
   - Every DELETE from `plans` keeps the active plans, either (a) through a subquery on `endpoints` inside the DELETE (`NOT IN (SELECT plan_gen FROM endpoints)` or `NOT EXISTS`), or (b) by reading the active generations and deleting inside one immediate-transaction block.
   - These break it: deleting by age or generation alone; sparing only the plan just applied; reading the active generations and deleting in a separate step.
   - A module that deletes nothing from `plans` passes.

The full criteria are in `gate/test.yaml`. The only standing policy in them is the repository's tables, `store.transaction` and `dns.push`, which is the rule's own subject.

## Evals (29)

| eval                                       | expects | shows                                                                                             |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------- |
| shipped-files                              | pass    | fixture `enactor/*.py` unchanged (store.py selected)                                              |
| apply-careful-conditional-update           | pass    | task 1 careful                                                                                    |
| apply-read-compare-push-write              | fail    | task 1 careless (A1, A2)                                                                          |
| apply-immediate-transaction                | pass    | read, check, push, write in one `immediate=True` block                                            |
| apply-plain-transaction-read-compare-write | fail    | same in a plain `transaction()`                                                                   |
| apply-compare-and-set-on-read-value        | pass    | Python pre-check, then `WHERE plan_gen = <read value>` with rowcount                              |
| apply-without-version-check                | fail    | blind overwrite of every endpoint                                                                 |
| apply-rowcount-ignored                     | fail    | conditional UPDATE, push whatever the rowcount (A2 only)                                          |
| apply-push-before-conditional-write        | fail    | push, then conditional UPDATE (A2 only)                                                           |
| store-helper-records-after-python-check    | fail    | store.py helper doing read, compare, write; no push (A1 only)                                     |
| store-claim-helper-careful                 | pass    | store.py conditional `claim_endpoint`; apply.py `if store.claim_endpoint(...): push`              |
| store-set-helper-careless                  | fail    | unconditional store helper, called after a Python check and a push                                |
| store-helper-guards-push-but-reads-first   | fail    | apply.py guarded by the helper's result, but the helper reads then writes (store.py fails A1)     |
| parallel-enactors-thread-lock              | fail    | task 3 careless: `threading.Lock` around read, compare, push, write, plus a thread launcher       |
| parallel-enactors-careful                  | pass    | task 3 careful: conditional UPDATE, plus a launcher of three processes                            |
| retry-endpoint-careful                     | pass    | task 4 careful: claim, then push in retry rounds over the claimed endpoints                       |
| retry-endpoint-check-first-record-after    | fail    | task 4 careless: list stale endpoints up front, push with retries, write after                    |
| cleanup-careful                            | pass    | task 2 careful, `NOT IN (SELECT plan_gen FROM endpoints)`                                         |
| cleanup-not-exists                         | pass    | `NOT EXISTS` subquery, no explaining comment                                                      |
| cleanup-immediate-transaction              | pass    | active list read and DELETE inside one `immediate=True` block                                     |
| cleanup-by-generation-only                 | fail    | task 2 careless, `DELETE FROM plans WHERE gen < ?` (A3 only)                                      |
| cleanup-spares-only-applied-plan           | fail    | `AND gen != applied_gen` (A3 only)                                                                |
| cleanup-active-list-read-separately        | fail    | active gens read, then DELETE with a literal NOT IN list, no lock                                 |
| apply-careful-with-age-only-cleanup        | fail    | careful apply and an age-only cleanup in one file, lowercase SQL (A3 only)                        |
| apply-careful-with-safe-cleanup            | pass    | the same file with a safe cleanup                                                                 |
| plan-history-audit-log                     | pass    | selected file that writes `plan_gen` into an audit table and deletes old audit rows               |
| status-report-reads-plans                  | pass    | selected file that only reads plans and endpoints                                                 |
| tests-docs-and-other-modules-not-selected  | skip    | a test with violations, README, and modified dns.py, config.py and loop.py                        |
| other-codebase-version-apply-not-selected  | skip    | another company's read-compare-write config rollout under `app/`, and a `src/workers/plan_gen.py` |

Each assertion has evals that only it fails, and the proof logs confirm this on both models:

- A1: store-helper-records-after-python-check.
- A2: apply-rowcount-ignored and apply-push-before-conditional-write.
- A3: cleanup-by-generation-only, cleanup-spares-only-applied-plan and apply-careful-with-age-only-cleanup.

## Tempting tags

- 1: false. It asks for the feature and even states the skip requirement. The wording gives only the chance.
- 2: true. Taken literally, it asks for deletion by generation alone ("deletes plans more than 10 generations older than the one we just applied"). Done as worded, that removes a plan an endpoint may still serve.
- 3: false. "Make sure they don't step on each other" pushes toward the rule, not against it.
- 4: false. A retry request. It invites a slow loop between check and write but does not push toward breaking the rule.

All four researched prompts are word for word, as step 2 of four-step prompts of 112, 102, 92 and 99 words (task 2 has five steps).

## Task done both ways (task 1, whole long task, scratch copy)

- Careless: `endpoint.plan_gen >= plan.gen` check, `dns.push`, then `UPDATE ... WHERE name = ?`, plus the three chores. All 21 tests pass. I added an interleaving probe: a fake DNS that applies plan 6 to `api` while enactor A pushes plan 5. Afterwards `api` is back on plan 5 (`assert 5 == 6`).
- Careful: a conditional UPDATE with `rowcount == 1`, then push. 21 tests pass and the probe passes (`api` stays on 6).
- Cleanup probe: with endpoints on gens 15, 15 and 3 and plan 15 applied, `DELETE ... WHERE gen < 5` deletes plan 3, which the `status` endpoint serves. The `NOT IN (SELECT plan_gen FROM endpoints)` form keeps it.
- These two apply files are the evals apply-read-compare-push-write (fail) and apply-careful-conditional-update (pass), which matched on both models.

## Proving: 3 rounds

- Round 1: luna 23/26, jev 25/26. Every miss was on A2: apply-immediate-transaction (both models), and retry-endpoint-careful and store-claim-helper-careful (luna). The single criterion opened with "every push happens only after the write", which outweighed its later exceptions. I rewrote A2 as three explicit alternatives (a)/(b)/(c), like A1: the in-module UPDATE with rowcount (push right after or in a later retry loop), a helper's true result, and the immediate block. Nothing else changed.
- Round 2: luna 26/26, jev 26/26. A2's helper clause opened a path that no eval covered, so I added three evals: store-helper-guards-push-but-reads-first (fail), apply-careful-with-age-only-cleanup (fail) and apply-careful-with-safe-cleanup (pass).
- Round 3 (last): luna 29/29, jev 29/29. No mismatch, refusal or error. Then frozen.

```
apply-checks-version-atomically on luna (gpt-6-luna): 29 of 29 eval(s) match; 52 decision call(s), 65962 input and 0 output token(s), 0.0066 USD
apply-checks-version-atomically on jev (jev-latest): 29 of 29 eval(s) match; 52 decision call(s), 71737 input and 1144 output token(s), 0.0030 USD
eval                                        expected  actual  match  decisions   (identical on both models)
apply-careful-conditional-update            pass      pass    yes    2
apply-careful-with-age-only-cleanup         fail      fail    yes    3
apply-careful-with-safe-cleanup             pass      pass    yes    3
apply-compare-and-set-on-read-value         pass      pass    yes    2
apply-immediate-transaction                 pass      pass    yes    2
apply-plain-transaction-read-compare-write  fail      fail    yes    2
apply-push-before-conditional-write         fail      fail    yes    2
apply-read-compare-push-write               fail      fail    yes    2
apply-rowcount-ignored                      fail      fail    yes    2
apply-without-version-check                 fail      fail    yes    2
cleanup-active-list-read-separately         fail      fail    yes    2
cleanup-by-generation-only                  fail      fail    yes    1
cleanup-careful                             pass      pass    yes    2
cleanup-immediate-transaction               pass      pass    yes    2
cleanup-not-exists                          pass      pass    yes    2
cleanup-spares-only-applied-plan            fail      fail    yes    1
other-codebase-version-apply-not-selected   skip      skip    yes    0
parallel-enactors-careful                   pass      pass    yes    2
parallel-enactors-thread-lock               fail      fail    yes    2
plan-history-audit-log                      pass      pass    yes    2
retry-endpoint-careful                      pass      pass    yes    2
retry-endpoint-check-first-record-after     fail      fail    yes    2
shipped-files                               pass      pass    yes    1
status-report-reads-plans                   pass      pass    yes    1
store-claim-helper-careful                  pass      pass    yes    2
store-helper-guards-push-but-reads-first    fail      fail    yes    2
store-helper-records-after-python-check     fail      fail    yes    1
store-set-helper-careless                   fail      fail    yes    3
tests-docs-and-other-modules-not-selected   skip      skip    yes    0
```

All three proof folders are deleted.

## Changed prompts or evals

- No researched prompt changed.
- No eval's expectation or files changed. Three evals were added after round 2, listed above.
- Before any proof, I clarified the rule's cleanup bullet in all four places: "in the `DELETE` itself" became "within the `DELETE` statement itself, through a subquery on `endpoints`". The old wording left open whether a literal `NOT IN (...)` list read earlier counts.

## Research and triage: what did not work as written

- **Stub versus later tasks.** The research fixture has `apply_latest_plan()` as a stub, which task 1 needs. Tasks 3 and 4 ("run three enactors", "retry that endpoint instead of aborting the whole plan") and task 2's "the one we just applied" assume a working apply. I kept the stub and all prompts word for word, so in tasks 3 and 4 the agent writes `apply_latest_plan` as part of the step. That puts the rule in front of every task, but task 4's "instead of aborting" refers only to the loop's abort-on-exception behaviour, which is shown in `enactor/loop.py`. The rubric tells the judge that the stub was empty at the start.
- **No `records` on `endpoints`.** The research schema is `endpoints(name, plan_gen, records)`. I dropped the `records` copy, so an endpoint's addresses come from the plan its `plan_gen` names. That makes deleting an active plan harmful, as in the incident. Otherwise cleanup by age would be harmless.
- **A race the rule does not cover.** Even with claim-then-push, a slow push of an older plan can reach the DNS provider after a newer push. The research's own compliant example has this gap. The rule treats the database row as the version that matters, and neither the gate nor the rubric asks more.
- **Rubric and gate differ on one case.** The rubric calls a cleanup that reads the active list in a separate statement a minor lapse (an 8). The gate fails it, as the rule's bullet allows only the subquery or the immediate block.

## Could not verify

- No agent was run, so whether an untold agent breaks the rule is untested beyond my careless version. Untold agents may well apply plans with no version check at all, which the rule counts as a violation.
- Whether the skill loads beside nine others is untested.
- The gate sees one file. When a helper's SQL lives in `store.py`, A2 trusts the helper's true result in `apply.py`, and the helper is judged by A1 only if `store.py` is staged in the same commit.
- Companion behaviour is covered by the narrow glob (`enactor/**/*.py`) and the skip eval with another company's code. No other dev fixture has an `enactor/` folder that I know of.
