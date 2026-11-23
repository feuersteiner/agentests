# Handoff: benchmark-v2, state on 23 November 2026

This note is for whoever picks the benchmark up next (Codex or a person). It says what is on this branch, what ran, what stopped it, and what is left. Benchmark results are not in git, by the owner's rule: they live in the zip handed to the owner, described at the end.

## Why it stopped

On 23 November at about 12:40 UTC the Claude account behind the cloud session hit its weekly limit (it resets 26 November, 00:00 UTC). That stopped everything at once:

- the 20 Opus workers building long-context variants, mid-build;
- the long-context benchmark run: 24 of its 160 runs completed, and 136 ended as `agent-error` with "You've hit your weekly limit".

Nothing has run since.

## What is on the branch

- **Dataset: all 122 short entries**, under `benchmarks/dataset/<rule-id>/`, each with its fixture, skill, gate (`test.yaml`, `TEST.md`, evals) and four short tasks. Tests were proved on both decision models and frozen; the proof summary is `benchmarks/orchestration/final-proof-summary.md`.
- **Dataset: 51 of the 100 planned long-context variants.** A long variant is a task keyed `<n>L` with a `context` target (200000 or 500000 tokens) and a `long/` folder whose `generate.ts` writes the long material deterministically. The plan is `benchmarks/orchestration/long-plan.json`; the 51 built are in `long-done.txt`; the 49 left are in `long-remaining.txt`.
- **Six unfinished long variants as patches** in `benchmarks/orchestration/long-wip/<rule-id>.patch`. Their workers stopped part way, so the patches are unchecked drafts and are not applied to the dataset. Apply one with `git apply benchmarks/orchestration/long-wip/<rule-id>.patch`, finish it, and check it as below. The other 14 workers that stopped had written nothing into the repository yet.
- **Harness changes** in `benchmarks/src/` and `benchmarks/cli/`, documented in `benchmarks/README.md` and `benchmarks/AGENTS.md`:
  - ten rules per run: the rule plus 9 same-domain companions that touch none of the fixture's files, chosen by a seeded draw (`src/companions.ts`), the same companions in the skill and gate arms;
  - long tasks, the `--context short|long` filter, and the long material built once per invocation;
  - context measurement for every run: peak context, window, share of the window and compactions (`src/agent.ts`);
  - the agent has no subagent tool (`--disallowedTools Agent Task`);
  - the judge falls back from Fable 5.2 to Opus 5.5 at `xhigh` effort when Fable is out of credit, and records which judged;
  - **a private `/tmp` for every agent** (`src/claude.ts`, commit `b406637`): the agent runs in a private mount namespace whose `/tmp` holds only its own workspace, plus the hook log and the read-only toolchain in a gate arm. This needs Linux and root (`unshare --mount`).
- **Orchestration kit** in `benchmarks/orchestration/`: the briefs the workers followed (`worker-brief.md` for short entries, `long-brief.md` for long variants, with the orchestrator's sizing additions at the end), the checkers (`check-long.ts`, `long-check.ts`, `audit.ts`), the commit helper (`commit-long.sh`), the proof scripts (`final-prove.sh`, `summarise-proofs.ts`), every worker's final report (`reports-short/`, `reports-long/`) and the scoreboard page's source (`scoreboard/`).

## What ran

The run folders are under `/tmp/agentests-benchmark/` in the cloud container. That folder is gone once the container is reclaimed, so the copy is in the zip. Each run keeps its own folder, described in "Reading one run" below.

| Run folder                                                                    | What it is                                                                                                                               | Runs                                                                                     |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `2026-11-23T09-53-54-628Z`                                                    | the full short run: 122 rules × 4 tasks × 4 arms (481 tests)                                                                             | 1,924: 1,913 completed, 11 no-commit, no machinery errors; every run judged by Fable 5.2 |
| `2026-11-23T11-52-34-196Z`                                                    | long run, the 40 long variants built by then, with the private `/tmp`                                                                    | 160: 24 completed, 136 stopped by the weekly limit                                       |
| `2026-11-23T11-30-12-584Z`                                                    | first long batch, **stopped and excluded**: agents of concurrent runs shared scratch files in `/tmp` (the reason for the private `/tmp`) | 15 completed before the stop                                                             |
| `2026-11-23T07-48-20-374Z`, `09-52-45-912Z`, `10-07-58-775Z`, `11-49-38-825Z` | smoke and calibration runs                                                                                                               | a few each                                                                               |

The 11 no-commit runs of the short run are all gate-arm runs: the gate blocked the commit and the agent stopped. That is an outcome, not a machinery error.

## Reading one run

Every run has a folder `runs/<rule-id>--<task>--<arm>/`, and `results.json` at the top of the run folder has one entry per run: its status, score, seconds, cost, peak context, companions and whether the agent loaded its skill. Inside the run's folder:

- `transcript.jsonl`: the agent's full stream from Claude Code, with every message, tool call and tool result;
- `session.jsonl` and `session/`: Claude Code's own session log, which also shows each skill body as Claude Code loaded it;
- `committed.diff` and `uncommitted.diff`: what the agent changed;
- `hook.log` (gate arms): one line per commit attempt, `<start> <end> <status>` where status 1 means blocked;
- `proxy.jsonl` (gate arms): every decision call the gate made through the harness's proxy, with tokens;
- `judge-prompt.md`, `judge.json`, `judge-output.json`: what the judge saw, its verdict and its raw output;
- `agent-stderr.log`, `judge-stderr.log`.

## What is left, in order

1. **Build the 49 remaining long variants** in `long-remaining.txt`, following `long-brief.md` exactly (its "Orchestrator additions" set the sizing: material at about 85% of a 200000 target and 110% of a 500000 target, by characters ÷ 4). Six have a draft patch to start from. Check each with `bun benchmarks/orchestration/check-long.ts <rule-id>` (deterministic build, size, and the entry's own Test selects none of the material), then `bash benchmarks/orchestration/commit-long.sh <rule-id>`.
2. **Run the long tests.** Rerun the 136 that hit the limit and run every long variant not yet run. From a clean checkout, with `core/dist` built and the keys in the root `.env`:

   ```sh
   cd benchmarks
   bun run benchmark --context long --concurrency 8 --timeout-minutes 60 --agent-budget-usd 15 --judge-budget-usd 3
   ```

   or name tests with `--test <rule-id>/<task>` (repeatable). The 24 long runs that completed are valid and need not be repeated. Running from a separate worktree keeps half-built variants out of the run.

3. **Refresh the scoreboard.** `benchmarks/orchestration/scoreboard/make-data.ts` collects every run into one JSON file; it reads older transcripts for context when `results.json` predates the context fields. Pass `SKIP=` with the excluded run folders above.
4. **Push** the branch: the cloud session could not, because the Claude GitHub App has no access to `feuersteiner/agentests`.

## Things to know

- **The agent is Claude Code** (Sonnet 5.5, `claude -p`), and the judge is Claude Code too. Whoever runs the harness needs the `claude` command logged in; Codex alone cannot run the agent arm without it.
- **Context tiers are nominal.** Long-context agents often condense big material with scripts instead of reading it whole, so the measured peak varies a lot within a tier; read the measured `peakContextTokens` of each run, not the tier.
- **Scope creep to watch** in a few long variants whose material mentions real bugs in the fixture as open tickets: `no-credentials-in-logs` 4L, `sentry-scope-tenant-queries` 4L, `schema-change-compatible-with-running-code` 1L. The agent may fix those unasked; that is not a breach of the rule.
- **Dataset edits the orchestrator made after proving**, each re-proved:
  - `form-errors-say-how-to-fix`: "while we check your application" became "while we review your application" in the fixture and 15 eval copies, because the fixture failed its own Test.
  - `zed-comments-explain-why`: neutral criterion examples, in a 6th prove round.
  - `rails-deprecate-before-removing`: round 4 of its Test restored.
  - `posthog-guard-double-submit` 1L: the copied step's example says "$10.05 shows as $10.5". Short task 1 still says "$10.50", which is wrong for the fixture, and was left alone to match its finished runs.
- **Never commit** results, workspaces, run archives or `.env`; never edit `core/`, a research quote, or a frozen Test and its evals.

## The zip

The owner received `agentests-handoff-2026-11-23.zip`, kept off GitHub. It holds every run folder above without workspaces or `node_modules`, a git bundle of this branch, the orchestrator's conversation and every worker's conversation with the decision keys redacted, the orchestrator's change log and the scoreboard data. Its `README.md` maps it.
