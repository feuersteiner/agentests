# Report: posthog-branching-decision-is-pure

Status: done. Entry at `benchmarks/dataset/posthog-branching-decision-is-pure/` (61 files). `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture; fixture tests pass as shipped (4 passed), no caches left.

## Resumed entry: what the second worker checked and changed

An earlier worker built the entry, ran five proving rounds (the last 20/20 on both models) and wrote most of this report, then stopped before handing back. The second worker re-checked every file against the runbook:

- `gate/` (TEST.md, test.yaml, 20 evals): unchanged since round 5 (no file in the entry is newer than that proof; it is identical to the scratch copy proved). The greps in `test.yaml` are exactly the ones the scratch generator builds, and were re-run offline on every eval and on both task 1 scratch copies with the results below. Five rounds were used, so the Test is frozen; nothing in `gate/` was changed.
- One confirmation proof of the frozen Test, unchanged, gave the same tables as round 5 (luna 20/20, jev 20/20, same decision counts and tokens). It is not a refinement round. Its proof folder is deleted, and no proof folder of this entry is left.
- `skill/SKILL.md`: the only file changed. Its `description` ended with "even when the request only says \"add logic that decides\" or \"implement the rules for\"", which quotes task 1's and nearly task 4's wording; the runbook forbids tuning the description to the tasks. It now reads: "Use whenever you write or change Python code under billing/ or another service module that chooses one outcome among several from business conditions, such as an eligibility or entitlement check, routing or assignment, deduplication, a retry or escalation policy, or a status or lifecycle transition, in code that also queries the database, calls an API client or reads the clock, even if the request says nothing about design or testing. Covers how to write the choice as a function of plain values with the current time passed in, and what the calling code around it does."
- `benchmark.yaml`, `rubric.md`, `fixture/`: kept as written. Rule and researched prompts match the research word for word; each prompt holds its researched prompt as step 2 of 4 or 5 (97 to 117 words); every chore step was checked against the fixture (whole-dollar export, missing `tools/` in Layout, `starter` in the seed script and README, `--out`, the missing `tickets` table, no CSV header, no `*.db` ignore). Rule text is word for word in the skill, `TEST.md` and the rubric, and no word of it (nor "pure", "decision", "clock") is in the fixture. Skill 77 lines with no unescaped `$` amount, rubric 59 lines.
- Task 1 both ways: the earlier scratch copies were re-checked (all four steps done in both, 6 tests pass in each after clearing caches) and the greps re-run on them.

## Final rule text (verdict as-is, no standing policy added)

Code that picks one outcome among several (eligibility, routing, dedupe, state transitions) is a pure function that takes plain values, including the current time, and returns the decision; the caller performs the database reads, client calls and clock reads and then carries the decision out.

It is the research rule word for word, and is in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, nowhere in `fixture/`.

## Fixture

`tallybird-billing`, a fictional billing back office: `billing/plans.py` (constants), `billing/repo.py` (SQLite schema, dataclasses, all queries), `billing/service.py` (six operations with no branching at all, so the shipped file holds no decision and no example of a pure one), `tools/seed_demo.py`, `tools/export_invoices.py`, `tests/test_service.py`, README, CHANGELOG, pyproject, .gitignore. Chore material planted for the other steps: export writes whole dollars and no header, README still says `starter`, omits `tools/` and the `tickets` table.

## Assertions (select: glob `billing/**/*.py`)

Both assertions have a structural `grep` ahead of the `decide`; the full regexes are in `gate/test.yaml` (long, generated, tested offline against every eval file).

1. `decision-does-no-io`
   - grep: matches when ONE function (from `def` to the next `def`) both touches a connection/repository/client (`repo.x(`, `conn`, `connection`, `cursor`, `.execute(`, `session`, `client`, `requests.`, `httpx.`, `smtplib.`) and holds a comparison (`==`, `!=`, `<=`, `>=`, `<`, `>`, `not in`, `if … in`, `case …:`, or `if/elif/and/or/not` on an attribute such as `customer.trial_extended`). No match clears the file.
   - decide, three alternatives (any one passes):
     a. "In this file, any function whose own body queries the database, calls a repository or query function (such as a `repo.` call or `conn.execute`) or calls an external client contains no condition that compares a business value, such as a plan, a status, a count, a date, an age or number of days, or keywords in a text, with a constant or a threshold in order to choose an outcome. Conditions that only test what a separate decision function returned (such as `if allowed:` or `if action is Action.RETRY:`) or whether a record was found do not count. A file where no function has such a condition satisfies this."
     b. "The comparisons that choose a business outcome in this file (on a plan, a record's status, a count, a date, a number of days or keywords in a text) are written in a function whose parameters are all plain values such as strings, numbers, booleans, dates, enums or simple records, with no database connection, cursor, session, repository or client among them, and that function only returns the outcome without saving or sending anything."
     c. "Nowhere in this file is a plan, a record's status, a count, a date, a number of days or a keyword in a text compared with a constant or a threshold to choose a business outcome; at most, the file acts on the decision that a function imported from another module returned."
2. `decision-reads-no-clock`
   - grep: matches when ONE function that touches no connection/repository/client both reads the clock (`now(`, `today(`, `utcnow(`, `time.time(`, `monotonic(`, `time_ns(`) and holds a comparison.
   - decide: "In this file, any function whose own body reads the current time (with datetime.now(), date.today(), time.time() or another clock call) contains no condition that compares a business value, such as a plan, a status, a count, a date, an age or number of days, or keywords in a text, with a constant, a threshold or the current time in order to choose an outcome. Conditions that only test what a separate decision function returned (such as `if allowed:` or `if action is Action.RETRY:`) or whether a record was found do not count, and neither does passing the time to another function or adding days to it. A file where no function has such a condition satisfies this."

## Evals (20)

| Eval                                   | Expects | What it is                                                                                |
| -------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| shipped-billing                        | pass    | the fixture's four `billing/` files unchanged                                             |
| tools-and-tests-are-not-billing        | skip    | a careless decision in `tools/` plus the test file: not selected                          |
| new-plan-constant                      | pass    | `plans.py` with a new plan (a chore step)                                                 |
| monthly-report-is-not-a-decision       | pass    | selected file about something else: a report that queries and reads the clock             |
| repo-queries-with-filters              | pass    | `repo.py` with SQL date filters, a not-found guard, `count > 0`                           |
| clock-helper-is-not-a-decision         | pass    | no-I/O helper that reads the clock and clamps `elapsed > 0`                               |
| trial-extension-careless               | fail    | task 1 the obvious way: `trial_extension_allowed(conn, customer_id)` reads repo and clock |
| trial-extension-careful                | pass    | task 1 careful: pure function plus loading caller, same file                              |
| extension-careful-with-not-found-guard | pass    | careful, own module, caller has `if row is None`                                          |
| trial-decision-reads-clock             | fail    | plain-value decision that calls `datetime.now()` (only assertion 2)                       |
| dunning-clock-fallback                 | fail    | `now = now or datetime.now()` inside the decision (only assertion 2)                      |
| trial-decision-counts-projects         | fail    | separated decision that still takes `conn` to count (only assertion 1)                    |
| failed-payment-careless                | fail    | task 2 the obvious way                                                                    |
| failed-payment-careful                 | pass    | task 2 careful, decision in `dunning.py`, caller dispatches with `is`                     |
| dispatch-on-returned-step              | pass    | careful, same file, caller dispatches with `step == "collections"`                        |
| ticket-routing-careless                | fail    | task 3 the obvious way (only assertion 1)                                                 |
| ticket-routing-careful                 | pass    | task 3 careful                                                                            |
| routing-decision-writes-queue          | fail    | decision gets plain values but takes `conn` and writes in the branches (only assertion 1) |
| lifecycle-careless                     | fail    | task 4 the obvious way: each transition loads, checks status, saves                       |
| lifecycle-careful                      | pass    | task 4 careful: transition table, pure `next_status`/`grace_expired`, callers             |

## Tasks and tempting tags

- 1: `tempting: false`. "Add logic that decides whether…" only asks for the work.
- 2: `tempting: false`. Names the inputs and outcomes, no push toward mixing I/O in.
- 3: `tempting: false`. Plain routing request.
- 4: `tempting: false`. Plain lifecycle request.

All four researched prompts are used word for word, as step 2 of four or five steps (97 to 117 words). Other steps: export script fix or header plus a test, README layout/tables/plans, `starter` to `team`, a `scale` plan, `--out` to `--output`, `.gitignore`, version bump, changelog. None touches the decision; the only one inside the Test's glob is the new plan constant (eval `new-plan-constant`, pass).

## Task 1 done both ways (scratch copies)

- Careless: `trial_extension_allowed(conn, customer_id)` in `service.py` loading the customer, calling `datetime.now()` and `repo.count_projects` between the conditions, plus the chores. pytest 6 passed. The file is exactly eval `trial-extension-careless`: assertion 1's grep hits and both models fail it.
- Careful: pure `trial_extension_allowed(plan, signed_up_at, now, had_extension, project_count)` plus `extend_trial(conn, customer_id)` that loads, reads the clock, calls it and writes; same chores. pytest 6 passed. Neither grep hits (eval `trial-extension-careful`, pass on both).

## Proving rounds: 5 (then one unchanged confirmation run)

1. Two negative universal criteria ("No function … reads the clock/calls the database and also contains the conditions…"), broad I/O greps. luna 10/16, jev 13/16. Both models failed the careful files (caller with `if allowed:`), luna also failed the shipped `service.py`.
2. Reworded as "any function whose own body … contains no condition … ; conditions that only test what a decision function returned do not count". Added eval `extension-careful-with-not-found-guard`. luna 13/17, jev 13/17. Careful same-file solutions still failed: the models cannot scope a claim to one function among many.
3. Assertion 1 as two alternatives (a pure decision function exists / the file compares nothing), clock as "every clock call sits in a function with a connection parameter" or "no clock-reading function has a condition". luna 12/17, jev 16/17 (jev let `trial-decision-reads-clock` pass; luna failed shipped `repo.py` and four careful files).
4. Added three evals (`dispatch-on-returned-step`, `repo-queries-with-filters`, `clock-helper-is-not-a-decision`). The rewritten `test.yaml` did not get written because my generator script crashed, so this round re-proved round 3's Test on 20 evals: luna 13/20, jev 18/20. It did show the scores repeat exactly between rounds.
5. Final: moved the function scoping into the two structural greps (one function with I/O and a comparison; one I/O-free function with a clock read and a comparison), so careful files are cleared locally and the models only see flagged files; assertion 1 decides with round 2's criterion plus round 3's two as alternatives, assertion 2 with round 2's clock criterion. luna 20/20, jev 20/20. No refusals, no errors in any round.

No eval was deleted, flipped or edited after it was first written; four were added (rounds 2 and 4).

Last round's tables (round 5; the confirmation run printed the same tables, with the same 27 decision calls and token counts on each model):

```
posthog-branching-decision-is-pure on luna (gpt-6-luna): 20 of 20 eval(s) match; 27 decision call(s), 39012 input and 0 output token(s), 0.0039 USD
eval                                    expected  actual  match  decisions  error
clock-helper-is-not-a-decision          pass      pass    yes    1
dispatch-on-returned-step               pass      pass    yes    3
dunning-clock-fallback                  fail      fail    yes    1
extension-careful-with-not-found-guard  pass      pass    yes    0
failed-payment-careful                  pass      pass    yes    0
failed-payment-careless                 fail      fail    yes    3
lifecycle-careful                       pass      pass    yes    0
lifecycle-careless                      fail      fail    yes    3
monthly-report-is-not-a-decision        pass      pass    yes    0
new-plan-constant                       pass      pass    yes    0
repo-queries-with-filters               pass      pass    yes    3
routing-decision-writes-queue           fail      fail    yes    3
shipped-billing                         pass      pass    yes    0
ticket-routing-careful                  pass      pass    yes    0
ticket-routing-careless                 fail      fail    yes    3
tools-and-tests-are-not-billing         skip      skip    yes    0
trial-decision-counts-projects          fail      fail    yes    3
trial-decision-reads-clock              fail      fail    yes    1
trial-extension-careful                 pass      pass    yes    0
trial-extension-careless                fail      fail    yes    3

posthog-branching-decision-is-pure on jev (jev-latest): 20 of 20 eval(s) match; 27 decision call(s), 40794 input and 594 output token(s), 0.0017 USD
eval                                    expected  actual  match  decisions  error
clock-helper-is-not-a-decision          pass      pass    yes    1
dispatch-on-returned-step               pass      pass    yes    3
dunning-clock-fallback                  fail      fail    yes    1
extension-careful-with-not-found-guard  pass      pass    yes    0
failed-payment-careful                  pass      pass    yes    0
failed-payment-careless                 fail      fail    yes    3
lifecycle-careful                       pass      pass    yes    0
lifecycle-careless                      fail      fail    yes    3
monthly-report-is-not-a-decision        pass      pass    yes    0
new-plan-constant                       pass      pass    yes    0
repo-queries-with-filters               pass      pass    yes    3
routing-decision-writes-queue           fail      fail    yes    3
shipped-billing                         pass      pass    yes    0
ticket-routing-careful                  pass      pass    yes    0
ticket-routing-careless                 fail      fail    yes    3
tools-and-tests-are-not-billing         skip      skip    yes    0
trial-decision-counts-projects          fail      fail    yes    3
trial-decision-reads-clock              fail      fail    yes    1
trial-extension-careful                 pass      pass    yes    0
trial-extension-careless                fail      fail    yes    3

```

All five proof folders and the confirmation run's folder are deleted.

## Research and triage: what did not work as written

- Nothing in the research entry had to change; the fixture follows it, with `tools/`, README and CHANGELOG added for the chore steps and `tickets`/`subscriptions` tables so tasks 3 and 4 have data.
- The triage's "judge each staged billing/*.py file" works, but the decision models could not hold "the function that decides" apart from its caller in the same file; that scoping is done by regex.

## Limits and what I could not verify

- The greps are heuristics for Python as this repository writes it. A careless decision that uses no comparison operator and tests only local names (for example `if not unpaid:` after assigning from a query) is cleared by the grep without a model call. A connection held in a module global rather than a parameter or `repo.`/`conn` name is not seen as I/O.
- Alternative (b) of assertion 1 is an existence claim: a flagged file that holds one pure decision and one careless one may pass.
- A careful caller that validates input with a comparison (`if plan not in PLANS`) reaches the model; only the `==` dispatch and SQL-filter false alarms are covered by evals.
- The gate fails a clock fallback (`now = now or datetime.now()`) inside the decision, which the rubric scores as a minor lapse (8); the two are deliberately not identical.
- An inline transition-table lookup in the function that loads and saves (rubric: mixed) has no eval; its gate outcome is unknown.
- No agent was run, so how often an untold agent picks the careless shape, and whether the skill's description gets it loaded beside nine others, is unverified. The Test was not run inside other entries' fixtures; it selects only `billing/**/*.py`.
- Repository state: only `benchmarks/dataset/posthog-branching-decision-is-pure/` is mine; `git status` shows other workers' changes in other entry folders.
- Found on review (no change possible, the Test is frozen): the I/O grep keys on the fixture's conventions (`repo.` calls, a `conn` parameter, `.execute(`). A careless decision that imports query functions directly (`from billing.repo import get_customer`) and names its connection `db` is cleared by the grep without a model call. The fixture's own code always uses `repo.` and `conn`, so an agent following the file is seen.
- Companion overlap: the research fixture of `calendar-arithmetic-handles-leap-days` (no dataset entry yet) has `billing/subscriptions.py` and `billing/schedule.py`, which this Test's glob selects there. Its pure date arithmetic passes the greps; a date helper with no I/O that reads the clock and compares a day (for example `today = today or date.today()` then `if today.day > 28`) would reach the clock criterion and may fail.
- Grep cost: offline, a 137 KB file runs both greps in a few ms; a single 1,500-line function takes about 0.25 s. No catastrophic backtracking seen.
- The confirmation run repeated round 5 exactly; two identical runs say the answers are stable on these evals, not that they would be on other files.
