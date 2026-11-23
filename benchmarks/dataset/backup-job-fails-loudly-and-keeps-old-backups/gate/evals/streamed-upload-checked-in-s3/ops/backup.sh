#!/usr/bin/env bash
# Nightly backup of the Acme Tutors production database (tutors on db-1) to S3.
# Run from ops/crontab on ops-1; its output goes to /var/log/acme/backup.log.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
. /etc/acme/ops.env

trap 'status=$?; [ "$status" -eq 0 ] || "$here/notify.sh" "tutors db backup FAILED on $(hostname) (exit $status)"' EXIT

name="tutors-$(date -u +%Y-%m-%d).sql.gz"

# Stream the dump straight to S3; pipefail makes a failed pg_dump fail the whole pipeline.
pg_dump --format=plain "$DATABASE_URL" | gzip | aws s3 cp --only-show-errors - "s3://acme-backups/db/$name"

# A normal dump is about 2 GB; check what actually landed in S3.
size=$(aws s3api head-object --bucket acme-backups --key "db/$name" --query ContentLength --output text)
if [ "$size" -lt 1000000000 ]; then
	echo "s3://acme-backups/db/$name is only $size bytes; old backups kept" >&2
	exit 1
fi
echo "uploaded $name ($size bytes)"

# Keep only the last 7 days of backups.
cutoff=$(date -u -d '7 days ago' +%Y-%m-%d)
aws s3 ls s3://acme-backups/db/ | while read -r _ _ _ old; do
	day=${old#tutors-}
	day=${day%%.*}
	if [[ "$day" < "$cutoff" ]]; then
		aws s3 rm --only-show-errors "s3://acme-backups/db/$old"
		echo "deleted $old"
	fi
done
