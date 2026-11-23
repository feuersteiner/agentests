# Changelog

## Unreleased

- Nothing yet.

## 0.7.0 - 2026-11-02

- Settings are cached for ten minutes, like profiles.
- `CacheClient.delete` returns how many keys it removed.

## 0.6.0 - 2026-10-07

- Profiles are cached in the shared cache server instead of in process memory.
- Added the `cache` package: a small asyncio client with its own connection pool.

## 0.5.0 - 2026-09-15

- Added `Handlers.get_settings`.
