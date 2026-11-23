#!/usr/bin/env bash
# Rotates the database password of r2-gateway's current login.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

login=$(db_list_logins | tail -n 1)
password=$(openssl rand -hex 24)

psql "$DB_ADMIN_URL" -v ON_ERROR_STOP=1 -c "alter role $login password '$password'"
echo "Changed the password of $login."

printf 'postgres://%s:%s@db.fennelprints.example/uploads' "$login" "$password" |
	wrangler secret put DATABASE_URL --env production

echo "Waiting for r2-gateway to reconnect as $login..."
until db_sessions "$login" | grep -q '^r2-gateway '; do
	sleep 30
done
echo "Done."
