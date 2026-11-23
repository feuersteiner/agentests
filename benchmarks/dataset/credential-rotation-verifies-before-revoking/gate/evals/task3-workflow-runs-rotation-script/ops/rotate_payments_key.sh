#!/usr/bin/env bash
# Rotates the Tillpoint API key (TILLPOINT_API_KEY) of the production payments Worker: creates a
# new key, gives it to payments, and deletes the old keys once payments' requests use the new one.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

old_ids=$(list_keys payments | awk '{print $1}')
read -r new_id new_key < <(create_key payments)
echo "Created payments key $new_id."

(cd payments && printf '%s' "$new_key" | wrangler secret put TILLPOINT_API_KEY --env production)

echo "Waiting for payments to use $new_id..."
for _ in $(seq 1 60); do
	if key_last_used payments "$new_id" | grep -q ' payments '; then
		for id in $old_ids; do
			delete_key payments "$id"
			echo "Deleted old payments key $id."
		done
		exit 0
	fi
	sleep 60
done

echo "payments has not used $new_id in an hour; old keys kept: $old_ids" >&2
exit 1
