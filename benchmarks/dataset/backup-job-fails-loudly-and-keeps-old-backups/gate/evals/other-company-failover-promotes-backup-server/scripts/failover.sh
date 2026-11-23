#!/usr/bin/env bash
# Kestrel Freight: promotes the backup database server (pg-b) to primary when pg-a is down,
# then points the app at it. Run by hand by the on-call engineer.
set -euo pipefail

if pg_isready -h pg-a.kestrel.internal -t 5; then
	echo "pg-a is answering; refusing to fail over" >&2
	exit 1
fi

ssh postgres@pg-b.kestrel.internal 'pg_ctl promote -D /var/lib/postgresql/16/main'
kubectl -n freight set env deploy/api DATABASE_HOST=pg-b.kestrel.internal
kubectl -n freight rollout status deploy/api --timeout=5m
echo "pg-b is primary; rebuild pg-a as its replica"
