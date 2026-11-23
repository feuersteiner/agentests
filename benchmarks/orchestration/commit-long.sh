#!/usr/bin/env bash
# Rechecks and commits finished long variants. Usage: bash commit-long.sh <entry-id>...
S=$(cd "$(dirname "$0")" && pwd)
cd "$S/../.."
ok=()
for id in "$@"; do
	if out=$(bun $S/check-long.ts "$id" 2>&1); then
		key=$(echo "$out" | grep -o "task [0-9]*L: target [0-9]*" | head -1)
		echo "ok $id ($key) $(echo "$out" | grep -o 'material is [0-9]*%')"
		ok+=("$id"); echo "$id" >> $S/long-done.txt
	else
		echo "CHECK FAILED $id"; echo "$out" | tail -4
	fi
done
[ ${#ok[@]} -eq 0 ] && exit 0
paths=(); for id in "${ok[@]}"; do paths+=("benchmarks/dataset/$id"); done
git add "${paths[@]}" && git commit -q -m "feat✨: add long-context variants for ${ok[*]}

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Qyhv13txo1V6sPPzd1x9VB" 2>&1 | grep -E "✗|rror"
git log --oneline -1
