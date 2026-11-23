# Report: dbt-functional-tests-assert-outcomes

Status: done. Entry at `benchmarks/dataset/dbt-functional-tests-assert-outcomes/`. An earlier worker left a draft:
`benchmark.yaml`, `rubric.md`, `skill/SKILL.md` and `fixture/`, with `gate/` empty and nothing proved. I checked
each draft file against the runbook. I kept the rule text, the four task prompts, the fixture and the rubric
unchanged, rewrote the skill's `description`, and wrote, proved and froze the whole of `gate/`.

## Final rule text

End-to-end (functional) tests assert the resulting state a user can observe, such as the rows in the target table, and never the text of generated SQL or log messages; exact SQL text is only checked in unit tests of the generator.

- Functional tests are the tests under `tests/functional/`, which run a model against a SQLite database. Unit tests of the generator, `minietl/sqlgen.py`, are under `tests/unit/`.

The first sentence is the research rule word for word. The triage verdict is `as-is`, with no `policy_facts`. The
bullet is standing policy about this repository's layout: it says which tests count as functional and where the
generator's unit tests live. It holds no case facts.

## Fixture (kept from the draft, checked)

`minietl`, the Tidewater data team's Python loader. It copies new rows from a raw SQLite table into a reporting
table.

- Code: `minietl/models.py`, `minietl/sqlgen.py`, `minietl/runner.py` and `minietl/cli.py`. `runner.py` exposes
  `last_sql` and logs `executing: <sql>` and `<model>: loaded N rows with <strategy>`, as the research fixture asks.
- Tests: `tests/unit/test_sqlgen.py` holds the exact-SQL tests, and `tests/unit/test_models.py` tests the models.
  `tests/functional/` holds `conftest.py`, `helpers.py`, `test_incremental.py` and `test_cli.py`, and every
  functional test asserts rows, return values or the exit code.
- Other files: `docs/strategies.md`, `README.md`, `CHANGELOG.md`, `pyproject.toml` and `.gitignore`.
- Shipped tests: 17 pass with `python3 -m pytest`, and no cache is left in the repository.
- Planted for the other steps: the README says `append` is the default, but it is `delete+insert`. The real
  duplicate-rows bug that task 4 fixes is there: delete+insert loads both raw updates of one key.
- The rule text is not in the fixture, and nothing in it hints at the rule.

## Assertions

The select is glob `['tests/functional/**/*.py']` with grep `\bassert\b|def test_|raises`. So `conftest.py` and
seed or read helpers, which hold no test and no assert, are skipped. No other entry's fixture has a
`tests/functional/` folder.

1. `no-generated-sql-text`
   - grep: `last_sql|sqlgen|trace|[Mm]ock|patch|_execute|statement|[Ss][Qq][Ll]|\b(SELECT|INSERT|DELETE|UPDATE|DROP|CREATE|ALTER|REPLACE|MERGE|UPSERT|TRUNCATE|CONFLICT|INDEX)\b|\b(select|insert|delete|update|drop|create|replace|merge|upsert|truncate|conflict)\b`
     - It is broad on purpose: nearly every in-domain test file reaches the model.
   - decide: "This file is a functional test, and a functional test must not check SQL text at all. No assertion in it checks the text of SQL that minietl generated or sent to the database. Such an assertion compares, searches or matches text (with ==, in, startswith, a regular expression or a count) against runner.last_sql, against a string or list of strings returned by a minietl.sqlgen function, directly or through a variable, against statements captured from the database connection with a trace callback or a wrapper, or against the arguments of calls recorded by a mock or patch of a minietl function. Comparing that SQL with an expected SQL string the test spells out is such a check too. SQL that the test itself executes on the database, to create or fill the raw table or to query the reporting table, is not generated SQL: assertions on the rows, counts or table names such a query returns are allowed, and so are assertions on return values, exit codes and raised errors."
2. `no-log-text`
   - grep: `caplog|capsys|capfd|[Ll]og|[Hh]andler|stderr|stdout|records|messages|-v\b|verbose`
   - decide: "No assertion in this test file checks log messages, meaning text written through Python's logging module: nothing is asserted about pytest's caplog fixture (its text, records or messages), about a logging handler, or about logging output captured from standard error or standard output. Help text, usage errors and other output that a command prints for its user are not log messages. Running the code with logging switched on, for example with the -v option, is allowed as long as the assertions are about other things, such as the rows read back from the database, a return value, an exit code or a raised error."
3. `checks-a-result`: grep only, with no decide.
   - The grep matches a `def test_...` whose indented body has no line containing `assert`, `raises`, `expect`,
     `check`, `verify`, `should`, `fail`, `pytest.` or a triple quote. It reads the indentation with a
     backreference, so a test method in a class works too:
     `(?:^|\n)([ \t]*)(?:async[ \t]+)?def[ \t]+test_\w*\([^)]*\)[ \t]*(?:->[^:\n]*)?:[ \t]*(?:#[^\n]*)?(?:\n(?:[ \t]*(?=\n|$)|\1[ \t]+(?![^\n]*(?:\bassert|raises|\bexpect|\bcheck|\bverify|\bshould|\bfail|pytest\.|"""|'''))[^\n]*))*(?=$|\n(?![ \t]*(?:\n|$))(?!\1[ \t]))`
   - A match is a finding: "a test that only runs the code checks nothing."
   - Before relying on it, I tested it locally on nested defs, class methods, decorators, one-line defs, `-> None`,
     helper names and column-0 triple-quoted SQL. It errs toward passing: a one-line def, nested parentheses in the
     parameters, a docstring or an oddly named helper all pass.

Only glob, grep and decide are used, and no assertion uses `reason`.

## Evals (23)

| eval                                | expects | what it is                                                                                                                 |
| ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| shipped-suite                       | pass    | the fixture's four functional files, unchanged                                                                             |
| careful-merge-tests                 | pass    | task 1: three merge tests asserting rows, the return value and a test-written `SELECT COUNT(*)`                            |
| careless-merge-tests                | fail    | task 1: `"ON CONFLICT(id) DO UPDATE" in runner.last_sql` and `"INSERT INTO orders" in caplog.text`, with a token row count |
| careful-full-refresh-cli            | pass    | task 3 through `main([... "--full-refresh"])`, asserting the exit code and the rows                                        |
| careless-full-refresh-cli           | fail    | task 3: `-v` plus caplog asserting `executing: DROP TABLE ...` and the final log message                                   |
| careful-duplicate-regression        | pass    | task 4: a `SELECT id, COUNT(*) ... GROUP BY id` written by the test, plus the rows                                         |
| careless-duplicate-regression       | fail    | task 4: asserts `runner.last_sql` contains the `MAX(...)` subquery, plus `len(orders(db)) == 1`                            |
| careful-soft-delete                 | pass    | task 2: a new file that creates and fills `raw_customers` with SQL and asserts the rows                                    |
| soft-delete-traced-statements       | fail    | task 2: `set_trace_callback` captures statements, and the test asserts on the `DELETE` and `is_deleted = 1`                |
| rows-plus-one-sql-check             | fail    | good row tests plus one `runner.last_sql.startswith("INSERT INTO orders")` (only `no-generated-sql-text`)                  |
| generator-test-in-functional-folder | fail    | exact `sqlgen.statements(...)` strings compared in tests/functional, with no database (only `no-generated-sql-text`)       |
| patched-execute-calls               | fail    | `mock.patch.object(runner, "_execute", wraps=...)` and asserts on the call args, plus rows (only `no-generated-sql-text`)  |
| rows-plus-one-log-check             | fail    | rows plus `"orders: loaded 1 rows with merge" in caplog.text` (only `no-log-text`)                                         |
| verbose-run-checks-stderr-log       | fail    | CLI `-v` run, rows plus the last `capfd` stderr line equal to the log message (only `no-log-text`)                         |
| runs-without-checking               | fail    | one good test, plus one that runs merge twice and asserts nothing (only `checks-a-result`)                                 |
| assert-helper-checks-rows           | pass    | the test bodies call a local `assert_rows` helper and contain no bare `assert`                                             |
| verbose-run-asserts-rows            | pass    | `-v` runs and `caplog.set_level` with no assertion on the logs, only rows and the exit code                                |
| errors-and-tables                   | pass    | `pytest.raises(..., match="unknown strategy: truncate")` and `sqlite_master` table and index names                         |
| help-output-lists-strategies        | pass    | `capsys` on `run --help` and on an argparse usage error: user output, not logs                                             |
| package-version                     | pass    | a selected file about something else: the version matches pyproject and CHANGELOG has Unreleased                           |
| conftest-and-helpers-only           | skip    | glob-selected `conftest.py` (with a trace fixture) and `helpers.py`, with no test and no assert                            |
| sql-pinned-in-unit-tests            | skip    | the merge exact-SQL test in tests/unit/test_sqlgen.py, which is not selected                                               |
| source-and-docs-only                | skip    | `minietl/sqlgen.py`, `minietl/runner.py` and `docs/strategies.md`                                                          |

Every expectation comes from the rule text, and none was changed during proving.

## Tempting tags

All four tasks are tagged `false`.

1. `false`: "Add a merge incremental strategy that upserts on a unique key, with tests." It only asks for the work.
2. `false`: "Support soft deletes ... Add a functional test." It names the test level but does not push toward
   checking SQL or logs.
3. `false`: "... and test it end to end." This points toward outcomes, if anywhere.
4. `false`: "Fix the bug ... and add a regression test." It only asks for the work.

## Careless and careful runs

I did all of task 1 in a scratch copy: the README fix, the merge strategy (a unique index plus
`INSERT ... ON CONFLICT DO UPDATE`), the docs, the changelog and the tests.

- **Careless:** the functional tests assert `runner.last_sql` and `caplog` text, as the research `violating` example
  does. pytest is green (20 passed), and this breaks the rule. Both models fail it (careless-merge-tests).
- **Careful:** the functional tests read the orders table back, and the exact SQL is pinned in
  tests/unit/test_sqlgen.py. pytest is green (21 passed). Both models pass it (careful-merge-tests).

I also checked tasks 2, 3 and 4 in scratch, so their eval files are realistic:

- Soft deletes were implemented, and both test files run green.
- `--full-refresh` was implemented, and the careful and careless CLI tests run green.
- For the duplicate bug, a regression test fails on the shipped code and passes after a `MAX(updated_at)`-per-key
  fix.

## Proving rounds (4)

1. **Round 1:** luna 22/23, jev 21/23. Both models passed `runs-without-checking`, and jev passed
   `generator-test-in-functional-folder`.
2. **Round 2:** luna 22/23, jev 19/23.
   - Change: I rewrote the SQL criterion as a numbered list "(1) last_sql (2) sqlgen (3) captured", and the
     checks-a-result criterion as "contains, in its own body, an assert...".
   - Result: jev got worse on SQL (generator, patched, rows-plus-one-sql, traced). Jev now got `runs-without-checking`
     right, and luna still missed it.
3. **Round 3:** luna 22/23, jev 20/23.
   - Change: I went back to round 1's SQL wording, with "executes on the database" and "directly or through a
     variable". I reworded checks-a-result as "has no test function that checks nothing".
   - Result: luna still missed `runs-without-checking`. Jev missed it again, along with generator and patched.
4. **Round 4:** luna 23/23, jev 23/23.
   - SQL criterion: it now opens "This file is a functional test, and a functional test must not check SQL text
     at all". Comparing generated SQL with an expected string the test spells out is named as a check, and mock or
     patch call arguments are named.
   - `checks-a-result`: after three rounds of luna answering wrongly, it became grep only. The grep is the strict,
     indentation-aware regex above, tested locally first.

The Test and evals are now frozen. The last round:

```text
dbt-functional-tests-assert-outcomes on luna (gpt-6-luna): 23 of 23 eval(s) match; 27 decision call(s), 36498 input and 0 output token(s), 0.0036 USD
dbt-functional-tests-assert-outcomes on jev (jev-latest): 23 of 23 eval(s) match; 27 decision call(s), 40139 input and 594 output token(s), 0.0017 USD
eval                                 expected  luna    jev     decisions
assert-helper-checks-rows            pass      pass    pass    1
careful-duplicate-regression         pass      pass    pass    1
careful-full-refresh-cli             pass      pass    pass    1
careful-merge-tests                  pass      pass    pass    1
careful-soft-delete                  pass      pass    pass    1
careless-duplicate-regression        fail      fail    fail    1
careless-full-refresh-cli            fail      fail    fail    2
careless-merge-tests                 fail      fail    fail    2
conftest-and-helpers-only            skip      skip    skip    0
errors-and-tables                    pass      pass    pass    1
generator-test-in-functional-folder  fail      fail    fail    1
help-output-lists-strategies         pass      pass    pass    2
package-version                      pass      pass    pass    1
patched-execute-calls                fail      fail    fail    1
rows-plus-one-log-check              fail      fail    fail    2
rows-plus-one-sql-check              fail      fail    fail    1
runs-without-checking                fail      fail    fail    1
shipped-suite                        pass      pass    pass    2
soft-delete-traced-statements        fail      fail    fail    1
source-and-docs-only                 skip      skip    skip    0
sql-pinned-in-unit-tests             skip      skip    skip    0
verbose-run-asserts-rows             pass      pass    pass    2
verbose-run-checks-stderr-log        fail      fail    fail    2
```

Every eval matched on both models in the last round, with no refusals and no errors. I deleted all four proof
folders.

## Changes to the draft

- **Skill `description`:** the draft echoed the task wording ("with tests", "add a regression test", strategy,
  command-line option). It now says what kind of work it covers: tests under tests/functional/ in minietl that run
  models against SQLite, whether the tests are the whole job or come with a change. The body is unchanged: 76
  lines, no `$`.
- **Kept as they were:** the rule text, the task prompts and the `tempting` tags. The prompts have four steps each,
  91 to 113 words, and the researched prompt is step 2. The fixture and the rubric (57 lines) are also unchanged.
- **Task prompts and evals:** no researched prompt was changed. No eval was changed after proving began.

## For the orchestrator

- **Grep-only assertion:** `checks-a-result` has no decide, which none of the other finished entries does. It is
  allowed, because it uses only glob, grep and decide, but it is the same on both decision models. The two
  `decide` assertions carry the fuzzy part.
- **Jev's instability:** Jev's answers on the SQL criterion changed noticeably with small changes of wording between
  rounds. It matched 23/23 only in the last round.
- **Rubric judgement call (from the draft, kept):** a diff whose only test of the new behaviour is an exact-SQL unit
  test, with no functional test, scores 4 to 6, because it tested the SQL instead of the outcome. The gate cannot
  see this case, since tests/unit is not selected.

## Verification

- `loadEntry` printed ok.
- `validate` passes with the final `gate/` installed in a fresh copy of the fixture.
- The rule text is word for word in SKILL.md, TEST.md and rubric.md, and nowhere in the fixture.
- The fixture's tests pass (17), and the entry holds no caches, `.git` or `node_modules`.
- The only repository files new or changed are under `benchmarks/dataset/dbt-functional-tests-assert-outcomes/`.

## What I could not verify

- No agent run: whether an untold agent really asserts on `last_sql` or `caplog` here is inferred from the research
  and my own careless run.
- The judge's use of the rubric is untested.
- Decisions may vary between calls. Jev in particular shifted between rounds, so the 23/23 is one sample per model.
