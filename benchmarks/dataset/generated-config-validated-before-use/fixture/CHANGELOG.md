# Changelog

## Unreleased

- `build-features` writes each feature's weight from the pipeline's export into
  `data/features.json`. The service does not use it yet.

## 1.4.0 - 2026-10-28

- `POST /score` answers with the names of the features that matched.
- Header names in the forwarded headers are matched without regard to case.

## 1.3.0 - 2026-09-15

- `GET /healthz` for the proxy's health checks.
- `FEATURES_PATH` sets the features file to read.
