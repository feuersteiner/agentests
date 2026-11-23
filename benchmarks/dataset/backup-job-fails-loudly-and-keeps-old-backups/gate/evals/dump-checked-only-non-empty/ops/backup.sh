#!/usr/bin/env bash
# Nightly backup of the Acme Tutors production database (tutors on db-1) to S3.
# Run from ops/crontab on ops-1; its output goes to /var/log/acme/backup.log.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
. /etc/acme/ops.env

stamp=$(date -u +%Y-%m-%d)
work=$(mktemp -d)

finish() {
	status=$?
	rm -rf "$work"
	if [ "$status" -ne 0 ]; then
		"$here/notify.sh" "tutors db backup FAILED on $(hostname) (exit $status), see /var/log/acme/backup.log"
	fi
}
trap finish EXIT

name="tutors-$stamp.sql.gz"
dump="$work/$name"
pg_dump --format=plain "$DATABASE_URL" | gzip > "$dump"

if [ ! -s "$dump" ]; then
	echo "dump is empty; not uploading it" >&2
	exit 1
fi
size=$(stat -c %s "$dump")

aws s3 cp --only-show-errors "$dump" "s3://acme-backups/db/$name"
uploaded=$(aws s3api head-object --bucket acme-backups --key "db/$name" --query ContentLength --output text)
if [ "$uploaded" != "$size" ]; then
	echo "s3://acme-backups/db/$name is $uploaded bytes, the dump is $size; old backups kept" >&2
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
