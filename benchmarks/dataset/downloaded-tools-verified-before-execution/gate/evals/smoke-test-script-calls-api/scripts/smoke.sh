#!/usr/bin/env bash
# Smoke test against a running slipway: health check, then one preview request.
set -euo pipefail

base="${SLIPWAY_URL:-http://localhost:8080}"

curl -fsS "$base/healthz" | grep -qx ok
response="$(curl -fsS -X POST "$base/previews" \
  -H 'Content-Type: application/json' \
  -d '{"branch": "smoke/test", "tag": "smoke"}')"
echo "$response" | grep -q '"release":"pr-smoke-test"'
echo "smoke: ok"
