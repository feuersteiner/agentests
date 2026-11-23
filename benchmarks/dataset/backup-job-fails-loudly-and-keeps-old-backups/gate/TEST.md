# Backup jobs fail loudly and keep old backups until the new one is verified

Shell scripts under `ops/`, `scripts/` and `bin/` sometimes run a backup or export job: they dump a
database or archive files, and upload or copy the result to a bucket or another host, and some
delete older backups to keep the last few days. In every such script:

A backup or export job exits non-zero and raises an alert through a monitored channel when any step fails or its output is empty or implausibly small, and deletes older backups only after the new backup has succeeded and been verified.

- At Acme Tutors the monitored channel is `ops/notify.sh`, which posts to the on-call webhook. A message that only reaches stdout, stderr, a log file or cron mail is not an alert.
- A step fails when any command in it fails, including a command before the last one in a pipeline, such as `pg_dump` in `pg_dump | gzip`, whose failure `set -e` alone does not catch.
- Acme Tutors' database dump is normally about 2 GB and an archive of its uploads directory about 6 GB. An output under half its normal size is implausibly small, so checking only that the file exists or is not empty is not enough.
- Verified means that after the upload the job has checked the copy at its destination, for example with `aws s3api head-object`. Deleting backups by age alone, such as with an expiry rule on the bucket or a deletion that runs even when an earlier step failed, breaks this rule.

A script that backs up or exports nothing, such as one that rotates a credential, sends a
notification or reindexes a table, has nothing to check. The channel and the sizes are Acme
Tutors' own, so another company's script, one that does not mention Acme, is not held to them;
the order of pruning holds for every backup job.
