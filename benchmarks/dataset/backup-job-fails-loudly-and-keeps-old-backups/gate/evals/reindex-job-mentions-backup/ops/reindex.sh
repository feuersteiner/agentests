#!/usr/bin/env bash
# Rebuilds the bloated indexes of the tutors database without locking writes.
# Runs from ops/crontab after the nightly backup has finished.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
. /etc/acme/ops.env

trap 'status=$?; [ "$status" -eq 0 ] || "$here/notify.sh" "reindex FAILED on $(hostname) (exit $status)"' EXIT

for index in lessons_tutor_id_idx invoices_student_id_idx bookings_starts_at_idx; do
	psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "REINDEX INDEX CONCURRENTLY $index"
	echo "reindexed $index"
done
