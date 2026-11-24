# v2: evaluator pilot and six-arm agent study

The original pilot evaluates completed refund replies. The separate
[complex support study](pilot/COMPLEX-SUITE.md) compares six ways to produce
a reply and internal plan across ten situations. These answer different questions.

Exactly five fixed original cases live in [pilot/](pilot/README.md). The original runnable harness
uses the existing public `core/dist` runtime: `createEngines`, `InMemorySource`,
and `AssertOrchestrator`. One decision assertion judges each reply. Verdicts
come from that runtime, never from matching reply text against expected labels.

- `pilot/`: original cases, separate provisional labels, policy assertion, protocol;
  `complex-support-01/` through `complex-support-10/` form a separate suite, each with five candidate alternatives.
- `run/`: a future full-run plan and honest not-run metadata.
- `workbench/`: original binary pilot CLI/settings, six-arm study runner and offline harness tests.
- `results/`: tracked empty-state README; raw run files are ignored and [archived privately](../evidence/EVIDENCE.md).

From a fresh clone, install the locked workspaces and build the public runtime
from the repository root. No private submodule or fixture download is needed.

```sh
bun --no-env-file install --frozen-lockfile
bun --no-env-file run build
cd benchmark/v2/workbench
bun --no-env-file run validate --models luna,jev --repeat 3
bun --no-env-file run check
bun --no-env-file run test
bun --no-env-file run dossier:validate
bun --no-env-file run six:validate
```

The original pilot's `cli.ts run` makes paid calls and requires separate
authorization. The original manifest's frozen development status is not a
current run-history assertion. No model calls are part of verification.

The six-arm study uses `gpt-6.1-terra` for every producer and blind judge.
It compares prompt alone, prompt plus a generic skill, and each of those with
an automatic agentests gate backed by Luna or TypeSafe Jev. The gates use the
shipped binary core with a 0.8 pass-probability threshold. The study schedules
180 producer trials: ten situations, six arms and three repeats. The protocol
judges each final draft, including drafts rejected by a gate; failures can leave
judgments unavailable. The existing fifty alternatives are evaluator controls,
not producer trials.

See the [study protocol](pilot/COMPLEX-SUITE.md#six-arm-agent-study) for limits,
commands, blinding and interpretation. The study does not convert core
probabilities into grades.

The workbench declares its runtime and build dependencies in the root workspace.
Root checks and tests include this pilot. The root test command completes core's
build and tests before starting the other workspace tests, preventing concurrent
rebuilds from removing the pilot's runtime. The harness never builds or modifies core.

The labels are **synthetic, provisional, and not human reviewed**. Agreement is
a development diagnostic, not calibrated quality or evidence of generalization.
These pilot development cases cannot also establish held-out performance.
