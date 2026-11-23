#!/usr/bin/env bash
# Nightly Postgres backup for Harbor Analytics: dumps the warehouse to s3://harbor-backups/db/,
# then rotates old dumps so only the last 14 days are kept.
set -euo pipefail

stamp=$(date -u +%Y-%m-%dT%H%M)
pg_dump --format=custom "$WAREHOUSE_URL" > "/tmp/warehouse-$stamp.dump"
aws s3 cp "/tmp/warehouse-$stamp.dump" "s3://harbor-backups/db/warehouse-$stamp.dump"
rm -f "/tmp/warehouse-$stamp.dump"

cutoff=$(date -u -d '14 days ago' +%Y-%m-%d)
aws s3 ls s3://harbor-backups/db/ | awk '{print $4}' | while read -r name; do
	day=${name#warehouse-}
	day=${day:0:10}
	if [[ "$day" < "$cutoff" ]]; then
		aws s3 rm "s3://harbor-backups/db/$name"
	fi
done
