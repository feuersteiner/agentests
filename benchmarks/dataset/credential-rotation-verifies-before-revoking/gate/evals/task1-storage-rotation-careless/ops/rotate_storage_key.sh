#!/usr/bin/env bash
# Rotates the R2 access key (STORAGE_KEY_ID and STORAGE_KEY_SECRET) of r2-gateway.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

old_ids=$(list_keys storage | awk '{print $1}')
read -r new_id new_secret < <(create_key storage)
echo "Created storage key $new_id."

printf '%s' "$new_id" | wrangler secret put STORAGE_KEY_ID
printf '%s' "$new_secret" | wrangler secret put STORAGE_KEY_SECRET
wrangler deploy

for id in $old_ids; do
	delete_key storage "$id"
	echo "Deleted old storage key $id."
done
echo "r2-gateway now uses storage key $new_id."
