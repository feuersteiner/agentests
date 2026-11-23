---
name: backup-job-fails-loudly-and-keeps-old-backups
description: Use whenever you write or change a backup, dump or export job - a shell script or cron job under ops/, scripts/ or bin/ that runs pg_dump, pg_dumpall, mysqldump or tar, uploads or copies the result to S3 or another bucket or region, or deletes old backups to keep the last N days. Covers how the job reports a failure, checks what it produced, and when it may delete older backups.
---

# Backup jobs fail loudly and keep old backups until the new one is verified

## The rule

A backup or export job exits non-zero and raises an alert through a monitored channel when any step fails or its output is empty or implausibly small, and deletes older backups only after the new backup has succeeded and been verified.

- At Acme Tutors the monitored channel is `ops/notify.sh`, which posts to the on-call webhook. A message that only reaches stdout, stderr, a log file or cron mail is not an alert.
- A step fails when any command in it fails, including a command before the last one in a pipeline, such as `pg_dump` in `pg_dump | gzip`, whose failure `set -e` alone does not catch.
- Acme Tutors' database dump is normally about 2 GB and an archive of its uploads directory about 6 GB. An output under half its normal size is implausibly small, so checking only that the file exists or is not empty is not enough.
- Verified means that after the upload the job has checked the copy at its destination, for example with `aws s3api head-object`. Deleting backups by age alone, such as with an expiry rule on the bucket or a deletion that runs even when an earlier step failed, breaks this rule.

## Why

In January 2017 GitLab lost six hours of production data. Its nightly `pg_dump` had been failing
because of a client and server version mismatch, and the cron emails that reported it
were rejected by the mail server, so nobody knew; when the database was deleted by mistake, the
backup bucket was empty. A backup job nobody hears from is only proven when you need it, and a
job that deletes old backups on a timer can delete the last good one while the new ones fail.

## How to apply it

1. Start the script with `set -euo pipefail`, or check `PIPESTATUS` after each pipeline.
2. Route every failure to the alert: an `EXIT` trap that calls `ops/notify.sh` when the exit
   status is non-zero catches failed commands and your own `exit 1` alike.
3. After each dump or archive is written, compare its size with a floor of half its normal size,
   and `exit 1` below it. A gzip of empty input is still about 20 bytes, so `-s` proves nothing.
4. After each upload, check the object at its destination, such as `aws s3api head-object`
   comparing `ContentLength` with the local size.
5. Delete older backups last, only on that path, in every bucket you prune.

Common slips: `pg_dump | gzip > f` without `pipefail`; `aws s3 cp ... || echo "copy failed"`;
a new archive or second copy added without its own checks; pruning before the upload, in a
separate cron line, or with a bucket lifecycle rule; `aws s3 sync --delete` into a backup prefix.

## Example

A nightly export of the month's invoices to `s3://acme-exports/invoices/` (normally about 40 MB),
keeping 30 days.

Violating: a failed `psql` leaves a tiny gzip that is uploaded, and old exports go regardless.

```bash
psql "$DATABASE_URL" -c "\copy invoices TO STDOUT CSV" | gzip > "$out"
aws s3 cp "$out" s3://acme-exports/invoices/
aws s3 ls s3://acme-exports/invoices/ | while read -r day _ _ key; do
  [[ "$day" < "$cutoff" ]] && aws s3 rm "s3://acme-exports/invoices/$key"
done
```

Compliant: every failure pages on-call, and old exports go only after the new one is confirmed.

```bash
set -euo pipefail
trap 'status=$?; [ "$status" -eq 0 ] || ops/notify.sh "invoice export FAILED (exit $status)"' EXIT
psql "$DATABASE_URL" -c "\copy invoices TO STDOUT CSV" | gzip > "$out"
size=$(stat -c %s "$out")
[ "$size" -ge 20000000 ] || { echo "export only $size bytes" >&2; exit 1; }
aws s3 cp "$out" "s3://acme-exports/invoices/$name"
remote=$(aws s3api head-object --bucket acme-exports --key "invoices/$name" \
  --query ContentLength --output text)
[ "$remote" -eq "$size" ] || { echo "uploaded size $remote, expected $size" >&2; exit 1; }
prune_older_than 30 s3://acme-exports/invoices/
```

## Before you commit

Read every backup or export script in the staged diff top to bottom and ask, for each command:
if this fails or produces almost nothing, does the job page on-call and exit non-zero? Then
check that no deletion of an older backup can run before the new one is verified. Fix what does
not hold and check again.
