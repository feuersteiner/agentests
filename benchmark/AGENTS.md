# Benchmark guide

Read [README.md](README.md), [evidence/EVIDENCE.md](evidence/EVIDENCE.md) and the affected version's
README before changes. Each version separates public pilot definitions, run plans
and workbench sources from ignored local `results/`. Only artifact-access notes
belong in public results READMEs. Measured results/scores, detailed run metadata,
logs, turns, transcripts, conversations, handoffs and construction history belong
in the optional PRIVATE `benchmark/private` submodule, with large archives in LFS.
Normal clones/checks never initialize it. Never upload evidence to a public remote.

`v1` is the historical skill-versus-commit-gate experiment, previously called
`benchmark-v2`. The new `v2` is a separate unrun evaluator pilot with five cases.

## Layout

- `evidence/`: shared private-evidence access/export instructions (`EVIDENCE.md`),
  explicit packaging CLI (`evidence.py`) and offline privacy/preservation tests
  (`evidence-test.py`). Tooling lives here; exported evidence belongs in `private/`.
- `private/`: optional private evidence submodule; never initialized by normal checks.
- `v1/` and `v2/`: version-specific methods, pilots, run plans and workbench sources.

## Preservation and privacy

- Preserve datasets, frozen Tests/evals, research quotes and raw evidence. Path
  repairs do not authorize changing data. Do not change core for a benchmark.
- v1 fixtures are optional checksummed public release ZIPs; read `v1/ARCHIVE.md`
  and `v1/archive-manifest.json`. Explicit hydration is
  `python3 -B benchmark/v1/archive.py restore`. Keep ZIPs/extracted data ignored.
  Reports, proof results, patches and conversations must never enter fixture ZIPs.
- Private export: follow `evidence/EVIDENCE.md`; verify origin and `isPrivate=true` before
  any upload. Scan export copies for credentials, inventory original/export hashes
  and verify preservation before deleting originals. Root `.env` and credential
  stores must never be read during maintenance or committed/uploaded.
- Never stage raw results, transcripts, conversations, archives, workspaces,
  secrets or LFS evidence blobs in the public repo. Stage only the private gitlink.
  Do not rewrite existing Git history or edit historical public issues.
- Publish measured claims only privately from identified real evidence. Label
  missing evidence and handoff claims. Record settings, denominators, exclusions,
  errors, judge identity and measured context. Exclude contaminated/calibration
  batches, separate quota failures and deduplicate retries.

## Offline maintenance

- Never start a paid pilot, proof or full run as a check. Measured runs require
  separate owner authorization. Use Bun `--no-env-file` for all offline commands.
- Run affected workbench typechecking, offline tests and CLI help; check root
  workspace commands after integration changes. Keep core tests passing.
- v1: `bun --no-env-file run --cwd benchmark/v1/workbench check` and `test`.
  `benchmark:pick` is offline. `benchmark`, `benchmark:pilot` and `benchmark:prove`
  make paid calls; their help does not. Fixture hydration stays explicit.
- v2: `bun --no-env-file run --cwd benchmark/v2/workbench check`, `test` and
  `validate`. Keep exactly five pilot cases and separate provisional labels.
- The v1 agent loop requires Linux/root for `unshare --mount`, authenticated
  Claude Code, built `core/dist` and decision credentials. Offline checks work
  on macOS. Keys stay in the harness process, outside agent workspaces/transcripts.
