#!/usr/bin/env bash
# Nightly backup of the Acme Tutors production database (tutors on db-1) to S3: dumps it, gzips
# it, uploads it to s3://acme-backups/db/ and keeps only the last 7 days of backups there.
# Run from ops/crontab on ops-1; its output goes to /var/log/acme/backup.log.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
. /etc/acme/ops.env

bucket=acme-backups
prefix=db
keep_days=7
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

# A normal dump is about 2 GB. Anything under 1 GB means tables or rows are missing.
size=$(stat -c %s "$dump")
if [ "$size" -lt 1000000000 ]; then
	echo "dump is only $size bytes, expected about 2 GB; not uploading it" >&2
	exit 1
fi

aws s3 cp --only-show-errors "$dump" "s3://$bucket/$prefix/$name"
uploaded=$(aws s3api head-object --bucket "$bucket" --key "$prefix/$name" --query ContentLength --output text)
if [ "$uploaded" != "$size" ]; then
	echo "s3://$bucket/$prefix/$name is $uploaded bytes, the dump is $size; old backups kept" >&2
	exit 1
fi
echo "uploaded $name ($size bytes)"

# Only now that tonight's dump is safely in S3, delete the ones older than 7 days.
cutoff=$(date -u -d "$keep_days days ago" +%Y-%m-%d)
aws s3 ls "s3://$bucket/$prefix/" | while read -r _ _ _ old; do
	day=${old#tutors-}
	day=${day%%.*}
	if [[ "$day" < "$cutoff" ]]; then
		aws s3 rm --only-show-errors "s3://$bucket/$prefix/$old"
		echo "deleted $old"
	fi
done
