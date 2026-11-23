#!/usr/bin/env bash
# Posts a message to the on-call webhook, which pages whoever is on call.
# Usage: ops/notify.sh "message"
set -eu

. /etc/acme/ops.env

message=${1:?usage: notify.sh "message"}
payload=$(printf '{"source":"ops-1","text":"%s"}' "${message//\"/\\\"}")

curl -fsS --max-time 20 --retry 3 \
	-H 'Content-Type: application/json' \
	--data "$payload" \
	"$ONCALL_WEBHOOK_URL" >/dev/null
