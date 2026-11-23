# v2: independent backend evaluation

The first pilot asks whether agentests can judge **completed refund replies**
against a business policy and case evidence. There is no producing agent, skill
competition, agent-in-loop gate, or artificial long-context task. Generation
quality and evaluator quality are separate questions.

Exactly five fixed cases live in [pilot/](pilot/README.md). The runnable harness
uses the existing public `core/dist` runtime: `createEngines`, `InMemorySource`,
and `AssertOrchestrator`. One decision assertion judges each reply. Verdicts
come from that runtime, never from matching reply text against expected labels.

- `pilot/`: cases, separate provisional labels, policy assertion, protocol.
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
```

Explicit real inference, using the existing private root environment file:

```sh
cd benchmark/v2/workbench
bun --env-file=../../../.env --no-install cli.ts run --models luna,jev --repeat 3
```

That command schedules 30 logical decisions and may incur provider charges.
The pilot has **not been run**. No model calls are part of verification.
The workbench declares its runtime and build dependencies in the root workspace.
Root checks and tests include this pilot; the declared core dependency orders
workspace tests after core builds. The harness never builds or modifies core.

The labels are **synthetic, provisional, and not human reviewed**. Agreement is
a development diagnostic, not calibrated quality or evidence of generalization.
These pilot development cases cannot also establish held-out performance.
