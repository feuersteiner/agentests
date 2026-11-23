# Changelog

## Unreleased

## 0.3.0 - 2026-10-14

- Previews install the chart named by `SLIPWAY_CHART` instead of a hard-coded one.
- `helm upgrade` waits for the release to be ready, up to `SLIPWAY_HELM_TIMEOUT`.

## 0.2.0 - 2026-09-02

- `POST /previews` answers 202 with the release name and installs in the background.
- `GET /healthz` for the load balancer.

## 0.1.0 - 2026-08-11

- First release: one preview release per branch.
