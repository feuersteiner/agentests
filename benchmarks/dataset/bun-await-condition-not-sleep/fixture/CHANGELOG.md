# Changelog

## Unreleased

## 0.3.0

- `RefreshingCache` emits `refresh` after a background refresh, and `error` when one fails.
- `createServer` answers 503 to requests that arrive after `stop()`.

## 0.2.0

- Added `FileWatcher`.
- `JobQueue` emits `drain` when it runs out of jobs.

## 0.1.0

- First version: `JobQueue`, `createServer` and `parseDuration`.
