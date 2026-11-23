#!/usr/bin/env bash
# Rotates the print lab API token (LAB_API_TOKEN) of the production r2-gateway: creates a new
# token, gives it to the gateway, and deletes the old tokens once the gateway's requests to the lab
# use the new one.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

old_ids=$(list_keys lab | awk '{print $1}')
read -r new_id new_token < <(create_key lab)
echo "Created lab token $new_id."

printf '%s' "$new_token" | wrangler secret put LAB_API_TOKEN --env production

# Rather than wait for the next completed order, make the gateway call the lab now: /healthz pings
# the lab with the gateway's token. The lab's request log then shows which token it used.
echo "Checking that r2-gateway uses $new_id..."
for _ in $(seq 1 12); do
	curl -fsS https://uploads.fennelprints.example/healthz >/dev/null || true
	if key_last_used lab "$new_id" | grep -q ' r2-gateway '; then
		for id in $old_ids; do
			delete_key lab "$id"
			echo "Deleted old lab token $id."
		done
		exit 0
	fi
	sleep 10
done

echo "r2-gateway has not used $new_id within 2 minutes; old tokens kept: $old_ids" >&2
exit 1
