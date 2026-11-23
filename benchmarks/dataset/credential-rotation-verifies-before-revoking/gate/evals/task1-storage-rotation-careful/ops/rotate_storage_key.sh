#!/usr/bin/env bash
# Rotates the R2 access key (STORAGE_KEY_ID and STORAGE_KEY_SECRET) of the production r2-gateway:
# creates a new key, gives it to the gateway, and deletes the old keys once the gateway's requests
# to R2 use the new one.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

old_ids=$(list_keys storage | awk '{print $1}')
read -r new_id new_secret < <(create_key storage)
echo "Created storage key $new_id."

secrets=$(mktemp)
trap 'rm -f "$secrets"' EXIT
jq -n --arg id "$new_id" --arg secret "$new_secret" \
	'{STORAGE_KEY_ID: $id, STORAGE_KEY_SECRET: $secret}' > "$secrets"
wrangler secret bulk "$secrets" --env production

# Uploads come in all day, so the new key should show up in R2's request log within minutes.
echo "Waiting for r2-gateway to use $new_id..."
for _ in $(seq 1 30); do
	if key_last_used storage "$new_id" | grep -q ' r2-gateway '; then
		for id in $old_ids; do
			delete_key storage "$id"
			echo "Deleted old storage key $id."
		done
		exit 0
	fi
	sleep 60
done

echo "r2-gateway has not used $new_id in 30 minutes; old keys kept: $old_ids" >&2
exit 1
