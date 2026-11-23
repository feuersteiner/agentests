# Changelog

## Unreleased

## 1.2.0 - 2026-10-19

- tools: add slowlog, the weekly slow-query report.
- ops: run the slowlog report every Monday from the crontab.

## 1.1.0 - 2026-08-04

- ops: backup.sh uploads the nightly dump to s3://acme-backups/db/.
- ops: add notify.sh.
