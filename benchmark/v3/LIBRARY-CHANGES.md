# Library changes from the v3 experiment (documentation only)

The source handoff does not change core/. These are the library changes previously
implemented for the v3 experiment, recorded for manual review. The library source,
public exports, tests and package version have been restored to the starting
commit. No proposal below is applied by the v3-only patch.

## Per-instance progress logging

The proposed public constructor was:

```ts
new Agentests(config, env, { log: () => {} });
new Agentests(config, env, { log: (message) => diagnostics.push(message) });
```

The proposal added these shared types and a default logger:

```ts
export type AgentTestLog = (message: string) => void;
export interface AgentTestOptions {
	log?: AgentTestLog;
}
export const defaultLog: AgentTestLog = (message) => console.log(message);
```

Agentests passed its callback to scope, select, assert and eval orchestrators.
Each exposed orchestrator gained an optional final callback argument. Existing
console.log progress calls became this.log calls. The default continued printing
progress. There was no production replacement of global console methods.

Files affected: core/src/index.ts, core/src/types.ts, core/src/log.ts,
core/src/{scope,select,assert,eval}/index.ts, and core/types.ts.

## Optional per-engine request limits

The decision and reasoning configurations gained this optional schema field:

```ts
concurrency: z.number().int().positive().optional();
```

Each engine factory wrapped each criterion's complete SDK invocation:

```ts
const request = createRequestLimiter(provider.concurrency);
const scores = await Promise.all(
	conditions.map((criterion) =>
		request(async () => {
			// The existing SDK call and its numerical result.
		})
	)
);
return Math.max(...scores);
```

The limiter shared slots across overlapping calls and alternative criteria in
one engine instance, and released them on success or error. Omission preserved
unbounded starts. Decision and reasoning limits were separate, even for the same
provider. SDK retry waits occupied the slot. No global account quota was implied.

Files affected: core/src/engines/{types,concurrency,decide,reason}.ts.

## Public API, version and verification proposals

The proposed core/types.ts exported AgentTestLog and AgentTestOptions. The package
version was changed from 1.0.1 to 1.1.0 for the experiment; this handoff restores
1.0.1. No npm release occurred. The corresponding lockfile version change is also
removed. Related AGENTS documentation and test helpers were changed to describe
these proposed APIs.

Added offline tests covered callback parity/isolation, overlapping criterion
requests, numerical OR parity, slot release after errors and loader validation.
Those library test files/edits are also documentation only in this handoff.

The proposal did not change model prompts, numeric engine returns, thresholds,
OR semantics, SDK retry defaults, stage ordering or serial Test/eval scheduling.
The later isolated judge and its evidence transport were implemented in the
benchmark, not by expanding core's numeric output contract.

## Exact source and test changes

See [LIBRARY-CHANGES-SNIPPETS.md](LIBRARY-CHANGES-SNIPPETS.md) for the complete
unapplied diff, including the added limiter, logger and regression tests.

The archived v3 source was written against these hooks. Its logging calls and
configuration fields are preserved as-run. Stock 1.0.1 does not implement those
hooks; compatibility requirements and manual integration are described in
[LOCAL-HANDOFF.md](LOCAL-HANDOFF.md). Historical validation is not a claim that
this archive runs unchanged against the restored stock library.
