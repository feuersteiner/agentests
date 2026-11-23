# v2: independent backend evaluation

The first pilot asks whether agentests can judge **completed refund replies**
against a business policy and case evidence. There is no producing agent, skill
competition, or agent-in-loop gate. Generation quality and evaluator quality are
separate questions. The original pilot is preserved independently of the new
[complex support dossier](pilot/complex-support-01/README.md), which reviews a
reply and internal plan across a substantial multi-document business context.

Exactly five fixed original cases live in [pilot/](pilot/README.md). The original runnable harness
uses the existing public `core/dist` runtime: `createEngines`, `InMemorySource`,
and `AssertOrchestrator`. One decision assertion judges each reply. Verdicts
come from that runtime, never from matching reply text against expected labels.

- `pilot/`: original cases, separate provisional labels, policy assertion, protocol;
  `complex-support-01/` is a separate single-situation fixture with five candidate alternatives.
- `run/`: a future full-run plan and honest not-run metadata.
- `workbench/`: CLI, configurable Luna/Jev settings, offline harness tests.
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
```

Explicit real inference, using the existing private root environment file:

```sh
cd benchmark/v2/workbench
bun --env-file=../../../.env --no-install cli.ts run --models luna,jev --repeat 3
```

That command schedules 30 logical decisions and may incur provider charges.
Execution history belongs in private evidence. The original manifest's frozen
development status is not a current run-history assertion. No model calls are
part of verification. The complex dossier supports offline validation and packet
preparation only; **graded evaluation is not implemented**. Core returns binary
findings and passing probabilities/scores, including from `reason`; it does not
execute the dossier's structured ordinal response contract. Its criteria arrays
use maximum passing score, and a cleared escalation stage skips later stages.
Multiple assertions do not supply the missing graded assessment structure.
An execution adapter or library decision requires a separately scoped follow-up;
probabilities must not be relabeled as grades.
The workbench declares its runtime and build dependencies in the root workspace.
Root checks and tests include this pilot. The root test command completes core's
build and tests before starting the other workspace tests, preventing concurrent
rebuilds from removing the pilot's runtime. The harness never builds or modifies core.

The labels are **synthetic, provisional, and not human reviewed**. Agreement is
a development diagnostic, not calibrated quality or evidence of generalization.
These pilot development cases cannot also establish held-out performance.
