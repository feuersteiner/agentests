#!/usr/bin/env bash
# Rotates the Postgres login of r2-gateway (DATABASE_URL): creates a new login, gives it to the
# gateway, and drops the old logins once the gateway connects with the new one.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

target=production
old_logins=$(db_list_logins)
read -r login password < <(db_create_login)
echo "Created login $login."

printf 'postgres://%s:%s@db.fennelprints.example/uploads' "$login" "$password" |
	wrangler secret put DATABASE_URL --env "$target"

echo "Waiting for r2-gateway to connect as $login..."
deadline=$((SECONDS + 1800))
until db_sessions "$login" | grep -q '^r2-gateway '; do
	if ((SECONDS >= deadline)); then
		echo "r2-gateway has not connected as $login in 30 minutes; old logins kept: $old_logins" >&2
		exit 1
	fi
	sleep 30
done

for old in $old_logins; do
	db_drop_login "$old"
	echo "Dropped old login $old."
done
