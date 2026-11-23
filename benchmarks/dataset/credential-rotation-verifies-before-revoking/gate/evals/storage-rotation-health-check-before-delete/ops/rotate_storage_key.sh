#!/usr/bin/env bash
# Rotates the R2 access key (STORAGE_KEY_ID and STORAGE_KEY_SECRET) of the production r2-gateway.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

old_ids=$(list_keys storage | awk '{print $1}')
read -r new_id new_secret < <(create_key storage)
echo "Created storage key $new_id."

printf '%s' "$new_id" | wrangler secret put STORAGE_KEY_ID --env production
printf '%s' "$new_secret" | wrangler secret put STORAGE_KEY_SECRET --env production

sleep 30
if ! curl -fsS https://uploads.fennelprints.example/healthz >/dev/null; then
	echo "r2-gateway is unhealthy after the change; old keys kept: $old_ids" >&2
	exit 1
fi

for id in $old_ids; do
	delete_key storage "$id"
	echo "Deleted old storage key $id."
done
