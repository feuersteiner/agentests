#!/usr/bin/env bash
# Nightly Postgres backup: dump, gzip, upload to S3, keep 7 days.
set -e

. /etc/acme/ops.env

BACKUP_DIR=/var/backups/acme
BUCKET=s3://acme-backups/db
FILE="tutors-$(date -u +%Y-%m-%d).sql.gz"

mkdir -p "$BACKUP_DIR"
echo "Dumping database..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$FILE"

echo "Uploading $FILE to $BUCKET..."
aws s3 cp "$BACKUP_DIR/$FILE" "$BUCKET/$FILE"

echo "Removing backups older than 7 days..."
find "$BACKUP_DIR" -name 'tutors-*.sql.gz' -mtime +7 -delete
aws s3 ls "$BUCKET/" | while read -r day _ _ key; do
	if [[ "$day" < "$(date -u -d '7 days ago' +%Y-%m-%d)" ]]; then
		aws s3 rm "$BUCKET/$key"
	fi
done

echo "Backup complete."
