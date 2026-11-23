# Archived orchestration tools

Public sources retain dataset-building briefs, checkers, proof tooling and
scoreboard code. Construction reports and unfinished patches are historical
evidence in the [private repository](../../../EVIDENCE.md); the optional public
fixture ZIP excludes them. Historical paths in private records describe the
original cloud checkout.

`audit.ts`, `check-long.ts` and `long-check.ts` call no models. `final-prove.sh`
makes paid decisions; `commit-long.sh` changes Git history. Neither belongs in
maintenance checks. The scoreboard collector requires an explicit runs directory
and writes to an explicitly chosen output path. Keep generated JSON ignored or
inside the private checkout; filter calibration, contamination and quota failures
before interpreting any comparison.
