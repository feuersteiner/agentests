# v3: controlled logging and scheduling follow-up

**Local handoff:** this is an archive of the v3 experiment. Library changes are
recorded only in [Markdown with snippets](LIBRARY-CHANGES.md), and are not applied
to `core/`. Read [LOCAL-HANDOFF.md](LOCAL-HANDOFF.md) for compatibility limits,
local application and the separate private-evidence archive before running it.

This follow-up reuses v2's fixed input-only producer protocol, binary gate and
independent full graded review. It is a mechanics pilot with twelve trials:
`complex-support-01` and `complex-support-02`, Luna and TypeSafe Jev gates,
three treatments and one repeat. Every producer and final reviewer is
`gpt-6.1-terra`. The synthetic development cases remain provisional and are
not held out. No measured result is asserted here.

The separate [isolated native-Test judge](run/isolated-judge.md) replaces the
single final assessment with 24 focused agentests Tests and a stronger reasoning
model. It is a judgment treatment with its own CLI, frozen contract and bounded
calibration, and is not part of the performance-only A/B/C comparison below.

- A preserves progress logging, producer feedback and baseline worker configuration.
- B suppresses gate progress through a per-instance logger. Producer feedback,
  packet contents, thresholds, draft limits and final review are identical to A.
- C preserves B's semantics and adds FIFO limits: four concurrent OpenAI
  producer/review calls and two gate calls per provider.

Case/provider blocks rotate the order A/B/C, B/C/A, C/A/B, A/B/C. Treatment
cohorts are isolated and each completes its final-review barrier before the
next cohort. With one repeat each cohort contains one trial; the configured
24 workers and C's caps therefore cannot establish a throughput difference.
The pilot checks runnable controls and evidence accounting. See
[protocol](run/protocol.md) for interpretation and larger follow-up requirements.

Each trial has at most three drafts, three gates and one final review. The
strict invocation limits are 36 producers, 36 gates, twelve reviews and 84
logical calls overall. Every forwarded HTTP attempt, including gate SDK
retries, is separately reserved against a hard ceiling of156. Each gate
forwards at most three attempts regardless of SDK behavior. Producer/review
adapters make one raw HTTP request and have no automatic retry. SDK defaults
may retry the same logical gate; this is recorded separately from logical calls.
No interrupted or uncertain call is automatically replayed. Existing run
identifiers are always refused; there is no resume command.

Offline setup and checks from the repository root:

```sh
bun --no-env-file install --frozen-lockfile
bun --no-env-file run build
bun --no-env-file run --cwd benchmark/v3/workbench check
bun --no-env-file run --cwd benchmark/v3/workbench test
bun --no-env-file run --cwd benchmark/v3/workbench validate
bun --no-env-file benchmark/v3/workbench/cli.ts --help
```

A future invocation requires completed investigation, separate owner
authorization, in-memory credentials and an already configured external provider
spending cap. These flags acknowledge those requirements; local code enforces
call ceilings, not a dollar limit. This command is documentation, not an
instruction to execute now:

```sh
bun --no-env-file benchmark/v3/workbench/cli.ts run --run-id OWNER_CHOSEN_ID \
  --allow-paid --external-spending-cap-confirmed
bun --no-env-file benchmark/v3/workbench/cli.ts report --run-id OWNER_CHOSEN_ID
```

Plan/settings, ordered inputs, prompts, source hashes, built core identity and
Bun/platform identity are frozen before execution. The private index records
logical-call queues, start/end times, exact input hashes and byte lengths,
draft-to-gate/reviewer provenance, HTTP attempt counts, usage when supplied,
errors and interrupted calls. Logging bytes/durations, evidence-write durations
and producer/reviewer wire response byte counts are explicitly unavailable;
gate response bytes are recorded. Missing provider usage/cost remains unavailable.
Raw artifacts live only under ignored `results/raw/`; no credentials are read
from files. Follow the shared [private evidence instructions](../evidence/EVIDENCE.md).
