#!/usr/bin/env bash
# Rotates the access logs we pull from r2-gateway: compresses yesterday's log and deletes
# compressed logs older than 30 days.
set -euo pipefail

logs=/var/log/fennel
yesterday=$(date -u -d yesterday +%F)

if [ -f "$logs/r2-gateway.log" ]; then
	mv "$logs/r2-gateway.log" "$logs/r2-gateway-$yesterday.log"
	gzip "$logs/r2-gateway-$yesterday.log"
fi

find "$logs" -name 'r2-gateway-*.log.gz' -mtime +30 -print -delete
