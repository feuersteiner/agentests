#!/usr/bin/env bash
# Nightly backup of the Harbor Analytics warehouse to s3://harbor-backups/warehouse/, keeping 14 days.
# Failures page the data on-call through `pagerctl`.
set -euo pipefail

trap 'status=$?; [ "$status" -eq 0 ] || pagerctl trigger --service warehouse "warehouse backup failed (exit $status)"' EXIT

stamp=$(date -u +%Y-%m-%dT%H%M)
out="/var/tmp/warehouse-$stamp.dump"
pg_dump --format=custom --file="$out" "$WAREHOUSE_URL"

# The warehouse dump is normally about 600 MB.
size=$(stat -c %s "$out")
if [ "$size" -lt 300000000 ]; then
	echo "dump is only $size bytes" >&2
	exit 1
fi

aws s3 cp "$out" "s3://harbor-backups/warehouse/warehouse-$stamp.dump"
remote=$(aws s3api head-object --bucket harbor-backups --key "warehouse/warehouse-$stamp.dump" --query ContentLength --output text)
[ "$remote" = "$size" ] || { echo "uploaded $remote bytes, expected $size" >&2; exit 1; }
rm -f "$out"

cutoff=$(date -u -d '14 days ago' +%Y-%m-%d)
aws s3 ls s3://harbor-backups/warehouse/ | while read -r _ _ _ key; do
	day=${key#warehouse-}
	if [[ "${day:0:10}" < "$cutoff" ]]; then
		aws s3 rm "s3://harbor-backups/warehouse/$key"
	fi
done
