#!/usr/bin/env bash
# Nightly backup of every database on db-1, with the roles, for Acme Tutors, to S3.
# Run from ops/crontab on ops-1; its output goes to /var/log/acme/backup.log.
set -eu

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

dump="$work/db-1-$stamp.sql.gz"
# pg_dumpall includes the roles; it only writes plain SQL, so gzip it.
pg_dumpall --dbname="$DATABASE_URL" | gzip > "$dump"

# A normal dump is about 2 GB. Anything under 1 GB means tables or rows are missing.
size=$(stat -c %s "$dump")
if [ "$size" -lt 1000000000 ]; then
	echo "dump is only $size bytes, expected about 2 GB; not uploading it" >&2
	exit 1
fi

aws s3 cp --only-show-errors "$dump" "s3://acme-backups/db/db-1-$stamp.sql.gz"
echo "uploaded db-1-$stamp.sql.gz ($size bytes)"
