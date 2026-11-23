# Worker brief: build one agentests benchmark dataset entry

You are building one entry of the agentests benchmark dataset, in the current repository (archived v1; historical branch benchmark-v2). Your rule id is given in your prompt; below it is written RULE_ID.

Follow `benchmark/v1/workbench/dataset/README.md` exactly: it is the runbook, rewritten today for a redesigned benchmark (long multi-step tasks, a `tempting` tag per task, skills the agent must choose to load beside nine other rules' skills, Tests that run beside nine other rules' Tests, and a prove-and-refine step on both decision models before the Test is frozen). Read `benchmark/v1/workbench/README.md` first for the method, then the runbook, then your rule's entries in its research file and in `benchmark/v1/workbench/research/triage.yaml`, and one or two finished entries in `benchmark/v1/workbench/dataset/` for the shape (a finished entry is one whose `benchmark.yaml` tasks have `prompt`, `researched` and `tempting`).

Your Test also runs, as a companion, in other entries' fixtures of your domain, on whatever files those agents stage. Keep its selection as narrow as the rule's subject allows (paths and extensions, and a grep where it helps), and phrase every criterion so that a file that does not touch the rule's subject passes. Companion fixtures belong to other fictional companies and products: when a criterion carries your company's standing policy (its plans, prices, names, limits), make sure another company's file passes, for example by naming your company or product in the criterion, and add an eval with such a file. Consider a separate `decide` alternative ("the text is about another company's product") for explicit scope handling; prefer the plainest wording that proves on both models.

Keep a copy of each round's `test.yaml` in your scratch folder. If your last proving round matched fewer evals than an earlier round did, put the earlier round's `test.yaml` back, prove it once more on the current evals, and freeze whichever of the two proved better; report that you did.

Constraints:

- Write only under `benchmark/v1/workbench/dataset/RULE_ID/`. Do scratch work only under an external private scratch directory for `RULE_ID`.
- Do not run git commands that change the repository (no add, commit, stash, checkout, reset); the orchestrator commits everything later. Do not push.
- Do not run `bun install`, `bun run build`, formatters, linters, or `bun run benchmark` / `benchmark:pilot` (those are paid agent runs). `core/dist` is already built, and a shared packed toolchain exists at `/tmp/agentests-benchmark/toolchain-shared`.
- The only model calls allowed are proofs, run from the repository root: `bun run benchmark:prove --entry RULE_ID --toolchain /tmp/agentests-benchmark/toolchain-shared --concurrency 3`. The decision keys sit in the root `.env`, which the harness reads itself: never open, print, copy or echo `.env` or any key.
- Delete each proof folder the command prints once you have read its tables.
- Never edit a quote in a research file, or any file outside your entry's folder. Other workers are building other entries at the same time; leave their folders alone.

When you are done, write your full report (the runbook's "What to report") to an ignored private scratch report named `RULE_ID.md`, and return ONLY a summary of at most 6 lines: the entry id; done, or blocked and why; the number of proving rounds; the last round's matches on luna and jev (for example `luna 14/14, jev 13/14`); the tempting tag of each task (for example `1:no 2:yes 3:no 4:no`); and anything the orchestrator must know.
