# Pilot protocol

The v1 pilot draws three tests from different rules using a recorded 32-bit seed.
`bun --no-env-file run benchmark:pick --seed <n> --json` replays selection offline.
`benchmark:pilot` makes paid calls and records the seed in private run metadata.
See [the method](../workbench/README.md#the-pilot).

Calibration outcomes, invocation IDs, settings and evidence gaps are in the
[private evidence repository](../../evidence/EVIDENCE.md). Smoke/calibration batches must
remain separate from full comparisons; do not invent missing replay seeds.
