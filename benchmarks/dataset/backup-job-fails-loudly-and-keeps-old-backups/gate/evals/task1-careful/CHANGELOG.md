# Changelog

## Unreleased

- tools: slowlog groups statements that differ only in quoted strings.
- ops: backup.sh gzips the dump and keeps only the last 7 days of backups in s3://acme-backups/db/.

## 1.2.0 - 2026-10-19

- tools: add slowlog, the weekly slow-query report.
- ops: run the slowlog report every Monday from the crontab.

## 1.1.0 - 2026-08-04

- ops: backup.sh uploads the nightly dump to s3://acme-backups/db/.
- ops: add notify.sh.
