# Changelog

## Unreleased

- The log is compacted when it grows past 10 MB: it is rewritten with only the latest value of each key.
- The demo starts from an empty directory on every run.
- The README's usage example calls `delete`, and the API table lists it.

## 0.3.0 - 2026-10-06

- `Store::delete` returns whether the key was present, and no longer logs a record for a missing key.
- `Store::log_bytes` reports the size of the log.

## 0.2.0 - 2026-08-18

- Every write is synced to disk before `set` and `delete` return.

## 0.1.0 - 2026-07-02

- First version: `open`, `set`, `get` and `delete`, replayed from the log on startup.
