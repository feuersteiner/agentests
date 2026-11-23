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
- `results/`: tracked empty-state README; raw run files are ignored and [archived privately](../EVIDENCE.md).

From the repository root, offline checks:

```sh
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
No install, root script, v1 path, core change, or workspace registration is needed
when the existing dependencies and `core/dist` are present. If compiled core is
absent, build it separately before using the harness; the harness never builds
or modifies core.

The labels are **synthetic, provisional, and not human reviewed**. Agreement is
a development diagnostic, not calibrated quality or evidence of generalization.
These pilot development cases cannot also establish held-out performance.
