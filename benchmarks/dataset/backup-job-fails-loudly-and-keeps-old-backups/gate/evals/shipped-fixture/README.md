# acme-ops

The jobs that run on `ops-1`, the operations host of Acme Tutors, and the small tools we use
to look after the production Postgres database.

- `ops/` holds the shell jobs and `ops/crontab`, which is installed on `ops-1` with
  `crontab ops/crontab`. The jobs read their settings from `/etc/acme/ops.env`; see
  `ops/ops.env.example` for the variables.
- `tools/` holds Python tools; `tests/` holds their tests.

## Production data

| What                  | Where                                 | Normal size       |
| --------------------- | ------------------------------------- | ----------------- |
| Postgres database     | `tutors` on `db-1`, as `DATABASE_URL` | about 2 GB dumped |
| Uploads (lesson PDFs) | `/srv/acme/uploads`, mounted on ops-1 | about 6 GB        |
| Database dumps        | `s3://acme-backups/db/` (us-east-1)   |                   |

`ops-1` reaches S3 through its instance role, so the `aws` CLI needs no keys there.

## Ops scripts

| Script          | What it does                                                           |
| --------------- | ---------------------------------------------------------------------- |
| `ops/backup.sh` | Dumps the `tutors` database every night and uploads the dump to S3.    |
| `ops/notify.sh` | Posts a message to the on-call webhook, which pages the on-call phone. |

## Tools

`python3 -m tools.slowlog <log>` reads the Postgres slow-query log and prints the slowest
queries, grouped by their normalised text, with their count and total time. `ops/crontab` runs it
every Monday and keeps the report in `/var/log/acme/`.

## Development

Python 3.10 or later with pytest. `python3 -m pytest` runs the tests; nothing else needs
installing. The shell jobs need `bash`, `pg_dump`, `aws` and `curl` on ops-1.
