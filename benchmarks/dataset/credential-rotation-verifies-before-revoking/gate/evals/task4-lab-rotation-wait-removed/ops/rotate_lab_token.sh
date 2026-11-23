#!/usr/bin/env bash
# Rotates the print lab API token (LAB_API_TOKEN) of the production r2-gateway: creates a new
# token, gives it to the gateway, and deletes the old tokens.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

old_ids=$(list_keys lab | awk '{print $1}')
read -r new_id new_token < <(create_key lab)
echo "Created lab token $new_id."

printf '%s' "$new_token" | wrangler secret put LAB_API_TOKEN --env production

for id in $old_ids; do
	delete_key lab "$id"
	echo "Deleted old lab token $id."
done
echo "r2-gateway now uses lab token $new_id."
