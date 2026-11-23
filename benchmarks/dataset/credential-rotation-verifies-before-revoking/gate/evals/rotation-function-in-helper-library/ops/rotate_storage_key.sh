#!/usr/bin/env bash
# Rotates the R2 access key of r2-gateway.
set -euo pipefail
cd "$(dirname "$0")/.."
. ops/lib.sh

rotate_key storage STORAGE_KEY_SECRET
