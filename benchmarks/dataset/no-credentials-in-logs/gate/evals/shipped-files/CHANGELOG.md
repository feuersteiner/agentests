# Changelog

## Unreleased

## 0.6.0

- Write an audit row for every forwarded request to the `audit_log` table.
- Give every request an `X-Request-Id`, keeping the caller's.

## 0.5.0

- Answer `GET /healthz` without asking the reports API.
- Read `UPSTREAM_TIMEOUT_MS` and stop waiting for the reports API after it.
