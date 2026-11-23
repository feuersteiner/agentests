# Changelog

## Unreleased

- release.Name no longer returns a name ending in a hyphen when it cuts a long branch name.
- CI runs golangci-lint on every push and pull request.
- `make lint` runs golangci-lint locally.

## 0.3.0 - 2026-10-14

- Previews install the chart named by `SLIPWAY_CHART` instead of a hard-coded one.
- `helm upgrade` waits for the release to be ready, up to `SLIPWAY_HELM_TIMEOUT`.
