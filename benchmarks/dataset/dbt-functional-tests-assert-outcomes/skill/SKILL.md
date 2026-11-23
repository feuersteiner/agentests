---
name: dbt-functional-tests-assert-outcomes
description: Use whenever you write or change a pytest test under tests/functional/ in minietl, the tests that run models against a SQLite database, whether the tests are the whole job or come with a new loading behaviour, a command-line change or a bug fix, even if the request only says "add tests". Covers what such a test asserts and where checks of the generated SQL belong.
---

# Functional tests assert outcomes

## The rule

End-to-end (functional) tests assert the resulting state a user can observe, such as the rows in the target table, and never the text of generated SQL or log messages; exact SQL text is only checked in unit tests of the generator.

- Functional tests are the tests under `tests/functional/`, which run a model against a SQLite database. Unit tests of the generator, `minietl/sqlgen.py`, are under `tests/unit/`.

## Why

A functional test exists to show that a load did the right thing to the data. An assertion on the
SQL text or on a log line passes when the statement looks right and the table is wrong, and fails
when someone rewrites the statement and the table is still right. So it protects nothing a user
cares about and breaks on harmless refactors. The exact SQL is an implementation detail: it has
one home, the unit tests of the generator, where a change to it is meant to be noticed.

## How to apply it

For each test under `tests/functional/`:

1. Set up the source data, run the code the way a user would (the runner or the command line),
   then read the target back from the database and assert on its rows.
2. Other outcomes are fine to assert too: a return value, an exit code, an exception, whether a
   table exists, a row count.
3. Do not assert on SQL the code produced, however you got hold of it: a "last statement"
   attribute, a string from the generator, a mocked or traced connection.
4. Do not assert on log output: `caplog`, a logging handler, log lines captured from the stream.
5. If you want to pin the exact SQL of a new generator function, write that test under
   `tests/unit/`, without a database.

SQL the test writes itself, to seed the source or to query the target, is not generated SQL.

Common slips: "prove" an upsert by checking the statement contains `ON CONFLICT`; prove a rebuild
by checking a `DROP TABLE` was logged; add one SQL-text assertion "for good measure" next to the
row assertions; put a generator test in the functional folder because the fixture was handy.

## Example

The feature: a `truncate` strategy that empties the target before loading.

Violating: checks what was sent and logged, not what the table holds.

```python
def test_truncate_strategy(db, caplog):
    seed_events(db, [(1, "signup")])
    run(db, "events", strategy="truncate")
    assert runner.last_sql.startswith("INSERT INTO events")
    assert "DELETE FROM events" in caplog.text
```

Compliant: the functional test reads the table, and the SQL text is pinned in the unit tests.

```python
# tests/functional/test_truncate.py
def test_truncate_drops_rows_that_left_the_source(db):
    seed_events(db, [(1, "signup"), (2, "login")])
    run(db, "events", strategy="truncate")
    remove_event(db, 2)
    run(db, "events", strategy="truncate")
    assert events(db) == [(1, "signup")]

# tests/unit/test_sqlgen.py
def test_truncate_empties_the_target_first():
    assert sqlgen.statements(EVENTS, "truncate")[0] == "DELETE FROM events"
```

## Before you commit

Read every assertion in the staged files under `tests/functional/`. Each one must be about data or
state read back after the run. Move any assertion about SQL text to `tests/unit/`, delete any
about log text, and check that every functional test still asserts the outcome it is named for.
