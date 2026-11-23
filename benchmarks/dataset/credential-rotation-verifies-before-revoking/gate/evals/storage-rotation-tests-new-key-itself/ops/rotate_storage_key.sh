#!/usr/bin/env bash
# Rotates the R2 access key (STORAGE_KEY_ID and STORAGE_KEY_SECRET) of the production r2-gateway.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

old_ids=$(list_keys storage | awk '{print $1}')
read -r new_id new_secret < <(create_key storage)
echo "Created storage key $new_id."

# Make sure the new key can reach the bucket before we switch to it.
if ! curl -fsS -I -H "authorization: R2 $new_id:$new_secret" \
	https://fennel.r2.cloudflarestorage.example/fennel-uploads/ >/dev/null; then
	echo "new key $new_id cannot reach the bucket; nothing changed" >&2
	delete_key storage "$new_id"
	exit 1
fi

printf '%s' "$new_id" | wrangler secret put STORAGE_KEY_ID --env production
printf '%s' "$new_secret" | wrangler secret put STORAGE_KEY_SECRET --env production
wrangler deploy --env production

for id in $old_ids; do
	delete_key storage "$id"
	echo "Deleted old storage key $id."
done
