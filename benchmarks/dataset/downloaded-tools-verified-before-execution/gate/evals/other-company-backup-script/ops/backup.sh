#!/usr/bin/env bash
# Fernhill Bakery: nightly backup of the orders database to object storage.
set -euo pipefail

: "${STORAGE_URL:?}" "${STORAGE_TOKEN:?}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump="/var/backups/orders-$stamp.sql.gz"

pg_dump --no-owner orders | gzip > "$dump"

# The manifest lists the backups we keep; fetch it, add tonight's, upload both.
curl -fsS -H "Authorization: Bearer $STORAGE_TOKEN" "$STORAGE_URL/orders/manifest.json" -o /tmp/manifest.json
jq --arg f "$(basename "$dump")" '.backups += [$f]' /tmp/manifest.json > /tmp/manifest.new.json
curl -fsS -H "Authorization: Bearer $STORAGE_TOKEN" -T "$dump" "$STORAGE_URL/orders/$(basename "$dump")"
curl -fsS -H "Authorization: Bearer $STORAGE_TOKEN" -T /tmp/manifest.new.json "$STORAGE_URL/orders/manifest.json"
echo "backup: uploaded $(basename "$dump")"
