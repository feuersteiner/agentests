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

seen=no
for _ in $(seq 1 10); do
	if key_last_used storage "$new_id" | grep -q ' r2-gateway '; then
		seen=yes
		break
	fi
	sleep 60
done
if [ "$seen" = no ]; then
	echo "warning: r2-gateway has not used $new_id after 10 minutes, deleting the old keys anyway" >&2
fi

for id in $old_ids; do
	delete_key storage "$id"
	echo "Deleted old storage key $id."
done
