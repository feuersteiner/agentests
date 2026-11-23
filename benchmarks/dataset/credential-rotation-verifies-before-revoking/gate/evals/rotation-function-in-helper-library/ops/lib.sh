# Shared helpers for the ops scripts. Source it from a script: . "$(dirname "$0")/lib.sh"
#
# API keys, by service: storage (the R2 access key of r2-gateway), lab (the print lab API token of
# r2-gateway) and payments (the Tillpoint API key of payments).
#
#   list_keys <service>               prints "<key-id> <created-at>" for each key, oldest first
#   create_key <service>              creates a key and prints "<key-id> <secret>"
#   delete_key <service> <key-id>     deletes a key
#   key_last_used <service> <key-id>  prints the latest requests made with a key, newest first, as
#                                     "<time> <client> <key-id>"; <client> is the Worker that sent
#                                     the request: r2-gateway, r2-gateway-dev, payments or payments-dev
#
# Database logins, the Postgres roles in the gateway_app group:
#
#   db_list_logins                    prints each login, oldest first
#   db_create_login                   creates a login and prints "<login> <password>"
#   db_drop_login <login>             closes the login's connections and drops it
#   db_sessions <login>               prints "<application-name> <connected-at>" for each open
#                                     connection made with the login
#
# Needs CF_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, LAB_ADMIN_TOKEN, TILLPOINT_ADMIN_KEY and DB_ADMIN_URL.

set -euo pipefail

_keys_api() { # _keys_api <service> <method> <path> [body]
	local base token
	case "$1" in
		storage) base="https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/r2/tokens" token="$CLOUDFLARE_API_TOKEN" ;;
		lab) base="https://api.printlab.example/v1/tokens" token="$LAB_ADMIN_TOKEN" ;;
		payments) base="https://api.tillpoint.example/v2/api_keys" token="$TILLPOINT_ADMIN_KEY" ;;
		*) echo "unknown service: $1" >&2; return 2 ;;
	esac
	curl -fsS -X "$2" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
		${4:+--data "$4"} "$base$3"
}

list_keys() { _keys_api "$1" GET "" | jq -r '.keys | sort_by(.created_at)[] | "\(.id) \(.created_at)"'; }
create_key() { _keys_api "$1" POST "" '{}' | jq -r '"\(.id) \(.secret)"'; }
delete_key() { _keys_api "$1" DELETE "/$2" >/dev/null; }
key_last_used() { _keys_api "$1" GET "/$2/requests" | jq -r '.requests[] | "\(.time) \(.client) \(.key_id)"'; }

_psql() { psql "$DB_ADMIN_URL" -At -F ' ' -v ON_ERROR_STOP=1 "$@"; }

db_list_logins() {
	_psql -c "select r.rolname from pg_roles r join pg_auth_members m on m.member = r.oid
		join pg_roles g on g.oid = m.roleid where g.rolname = 'gateway_app' and r.rolcanlogin order by 1"
}

db_create_login() {
	local login password
	login="gateway_$(date -u +%Y%m%d%H%M)"
	password="$(openssl rand -hex 24)"
	_psql -c "create role $login login password '$password' in role gateway_app" >/dev/null
	echo "$login $password"
}

db_drop_login() {
	_psql -c "select pg_terminate_backend(pid) from pg_stat_activity where usename = '$1'" \
		-c "drop role $1" >/dev/null
}

db_sessions() { _psql -c "select application_name, backend_start from pg_stat_activity where usename = '$1'"; }

# rotate_key <service> <secret-name> [worker-dir]: replaces a service's key in one go.
rotate_key() {
	local service="$1" secret="$2" dir="${3:-.}" old_ids new_id new_secret
	old_ids=$(list_keys "$service" | awk '{print $1}')
	read -r new_id new_secret < <(create_key "$service")
	(cd "$dir" && printf '%s' "$new_secret" | wrangler secret put "$secret" && wrangler deploy)
	for id in $old_ids; do
		delete_key "$service" "$id"
	done
	echo "$service now uses key $new_id"
}
