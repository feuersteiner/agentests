#!/usr/bin/env bash
# Proves every dataset entry on both decision models, 6 entries at a time, and keeps each proof.json.
# Usage: bash final-prove.sh <output folder>
set -u
out="$1"
mkdir -p "$out/logs"
out=$(cd "$out" && pwd)
input="${2:-/dev/stdin}"
if [ "$input" != /dev/stdin ]; then
	input="$(cd "$(dirname "$input")" && pwd)/$(basename "$input")"
fi
cd "$(dirname "$0")/../../../.."
cat "$input" | xargs -P 6 -I{} sh -c '
	bun run benchmark:prove --entry {} --toolchain /tmp/agentests-benchmark/toolchain-shared --concurrency 3 > "'"$out"'/logs/{}.log" 2>&1
	folder=$(grep -o "Proof folder: .*" "'"$out"'/logs/{}.log" | head -1 | cut -d" " -f3)
	if [ -n "$folder" ] && [ -f "$folder/proof.json" ]; then cp "$folder/proof.json" "'"$out"'/{}.proof.json" && rm -rf "$folder"; fi
'
