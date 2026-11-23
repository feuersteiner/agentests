#!/usr/bin/env bash
# Rotates the database password of r2-gateway: new login, new DATABASE_URL, old login dropped.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

old_logins=$(db_list_logins)
read -r login password < <(db_create_login)
echo "Created login $login."

printf 'postgres://%s:%s@db.fennelprints.example/uploads' "$login" "$password" |
	wrangler secret put DATABASE_URL --env production
wrangler deploy --env production

for old in $old_logins; do
	db_drop_login "$old"
	echo "Dropped old login $old."
done
