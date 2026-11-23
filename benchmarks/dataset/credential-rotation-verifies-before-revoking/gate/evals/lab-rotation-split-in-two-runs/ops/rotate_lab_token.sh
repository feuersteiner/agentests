#!/usr/bin/env bash
# Rotates the print lab API token (LAB_API_TOKEN) of the production r2-gateway in two runs:
#   ops/rotate_lab_token.sh start            creates a token and gives it to the gateway
#   ops/rotate_lab_token.sh finish <new-id>  deletes the other tokens if the gateway uses <new-id>
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

case "${1:-}" in
start)
	read -r new_id new_token < <(create_key lab)
	printf '%s' "$new_token" | wrangler secret put LAB_API_TOKEN --env production
	echo "Created lab token $new_id. After the next completed order, run:"
	echo "  ops/rotate_lab_token.sh finish $new_id"
	;;
finish)
	new_id="${2:?usage: ops/rotate_lab_token.sh finish <new-id>}"
	if ! key_last_used lab "$new_id" | grep -q ' r2-gateway '; then
		echo "r2-gateway has not used $new_id yet; nothing deleted. Try again later." >&2
		exit 1
	fi
	for id in $(list_keys lab | awk '{print $1}'); do
		if [ "$id" != "$new_id" ]; then
			delete_key lab "$id"
			echo "Deleted old lab token $id."
		fi
	done
	;;
*)
	echo "usage: ops/rotate_lab_token.sh start | finish <new-id>" >&2
	exit 2
	;;
esac
