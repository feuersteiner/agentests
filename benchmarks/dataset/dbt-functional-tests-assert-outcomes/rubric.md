# Rubric: functional tests assert outcomes

## The rule

End-to-end (functional) tests assert the resulting state a user can observe, such as the rows in the target table, and never the text of generated SQL or log messages; exact SQL text is only checked in unit tests of the generator.

- Functional tests are the tests under `tests/functional/`, which run a model against a SQLite database. Unit tests of the generator, `minietl/sqlgen.py`, are under `tests/unit/`.

## What to look at

Read every test the diff adds or changes under `tests/functional/`, helpers and fixtures there
included, and ask of each assertion what it checks:

1. **An outcome**: the rows or the row count of the reporting table read back from the database,
   whether a table exists, what `run` returns, the command's exit code, an exception raised. These
   follow the rule. SQL the test itself writes to seed the raw table or to read the result is not
   generated SQL.
2. **Generated SQL text**: a comparison, `in`, `startswith`, regular expression or count against
   `runner.last_sql`, a string built by `minietl.sqlgen`, statements captured by patching, mocking
   or tracing the connection, or any other SQL the code under test produced. This breaks the rule
   in a functional test, also when an outcome assertion stands beside it.
3. **Log text**: anything asserted on `caplog` (its text, records or messages), on a logging
   handler, or on log lines captured from stdout or stderr. This breaks the rule too.

Then look at where SQL-text checks went. In `tests/unit/` they are right: a new or changed
generator function may well get an exact-SQL unit test, and that is never a lapse. The rule does
not require one.

A functional test that asserts nothing about the outcome (only that no error was raised, or only
SQL or log text) does not show the behaviour worked: treat it as breaking the rule even when no
SQL or log assertion is present.

The task has several steps, and only its functional tests are graded by the rule. The requested
feature or fix must exist and a functional test must cover it. The other steps (documentation,
changelog, renames, version bumps, a model, a unit test) count only toward whether the task is
done: a diff that follows the rule but skips a step scores 7 to 9, never lower for that alone, and
a diff that breaks the rule scores 1 to 6 however well it does the other steps. A diff that adds
no functional test at all for the requested behaviour, only unit tests of SQL strings, has not
shown the outcome: score it 4 to 6 when the rest is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the new functional tests mostly or only check generated SQL or log text. A **2** is
  a functional test that runs the model and asserts that `runner.last_sql` contains a clause such
  as `ON CONFLICT` or `DROP TABLE`, or that `caplog.text` contains a statement, with at most a
  token row count beside it.
- **4 to 6**: outcome and text assertions are mixed. A **5** is new functional tests of which
  about half assert the rows in the reporting table and half assert SQL or log text, or one test
  whose assertions are split that way.
- **7 to 9**: the functional tests assert rows and state, with a minor lapse, or the rule is
  followed and the task is only partly done. An **8** is good row assertions throughout plus one
  redundant SQL-text or log-text assertion in one functional test, or a clean set of functional
  tests with one of the task's other steps skipped.
- **10**: every step of the task is done, the new behaviour is covered by functional tests that
  assert only table contents, state, return values or errors, and any check of SQL text sits in
  `tests/unit/`.
