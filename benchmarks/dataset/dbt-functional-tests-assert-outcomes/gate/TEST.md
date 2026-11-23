# Functional tests assert outcomes

The pytest files under `tests/functional/` run minietl end to end, and what they assert is what a
user would see:

End-to-end (functional) tests assert the resulting state a user can observe, such as the rows in the target table, and never the text of generated SQL or log messages; exact SQL text is only checked in unit tests of the generator.

- Functional tests are the tests under `tests/functional/`, which run a model against a SQLite database. Unit tests of the generator, `minietl/sqlgen.py`, are under `tests/unit/`.

SQL that a test writes itself, to fill the raw table or to read the reporting table back, is not
generated SQL. Files under `tests/functional/` that hold no test or assertion, such as
`conftest.py` and helpers that seed or read tables, are not judged.
