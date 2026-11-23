#!/usr/bin/env bash
# Rotates the R2 access key (STORAGE_KEY_ID and STORAGE_KEY_SECRET) of the production r2-gateway.
# The old key stays until someone deletes it by hand.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

old_ids=$(list_keys storage | awk '{print $1}')
read -r new_id new_secret < <(create_key storage)
echo "Created storage key $new_id."

printf '%s' "$new_id" | wrangler secret put STORAGE_KEY_ID --env production
printf '%s' "$new_secret" | wrangler secret put STORAGE_KEY_SECRET --env production

echo "r2-gateway now has storage key $new_id. The old keys are still active: $old_ids"
echo "Once 'key_last_used storage $new_id' shows r2-gateway, delete them with ops/lib.sh's delete_key."
