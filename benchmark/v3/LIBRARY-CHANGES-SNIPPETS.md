# Unapplied library changes and snippets

This is a historical source/test diff inside Markdown. Indentation and blank
context lines are normalized for display; this is a review log, not a patch file. The v3-only patch applies
this document, not the code shown below. Base: `4055525ab68e37bf23c5db63f4794b8624655e4d`.

````diff
diff --git a/core/AGENTS.md b/core/AGENTS.md
index 185798a7..45b50438 100644
--- a/core/AGENTS.md
+++ b/core/AGENTS.md
@@ -15,6 +15,7 @@
 - `src/AGENTS.md`: the rules every `src/` module follows; only the loader validates.
 - `src/index.ts`: the `Agentests` class, the main class and the entry for everything, built from the full config and an environment map (`AgentTestEnv`), throwing when the decision or reasoning API key is missing or blank, with the engines as a protected member, for test stubs, and one scope, select, assert, and eval orchestrator as private members; `run(scope, id?)` loads the Tests through the loader, scopes the sources once, runs each Test's select then assert one Test after another, and returns each Test with its findings; `eval(id?)` loads the Tests and their evals through the loader, runs each Test's evals one after another, and returns each Test with each eval's expected and actual outcome and findings; these are its only public members; not a barrel.
 - `src/types.ts`: the shared building-block schemas; imports nothing from the package.
+- `src/log.ts`: the default human-readable progress callback, resolving `console.log` when called. `Agentests(config, env, { log })` passes one per-instance callback to all orchestrators; each exposed orchestrator also accepts an optional final log callback. Omit it for existing console behavior, or pass a no-op for quiet operation; never replace the global console to quiet a run. Shared `AgentTestLog` and `AgentTestOptions` types live in `src/types.ts` and are exported from `types.ts`.
 - `src/loader/`: loads, parses, and validates `test.yaml`, `eval.yaml`, and `agentests.config.yaml`, three files per folder, Test and eval folders sorted by name, and owns their schemas in `types.ts`; layout locked in its `AGENTS.md`.
 - `src/engines/`: the glob, grep, decide, and reason engines; each scores an input against criteria. `index.ts` is the single import; rules locked in the folder's `AGENTS.md`.
 - `src/sources/`: file, directory, and in-memory sources, each with a logical path, a kind, and lazily cached text content; a directory lists its immediate children sorted by name. `index.ts` is the single import.
diff --git a/core/package.json b/core/package.json
index 69c11d96..e8555209 100644
--- a/core/package.json
+++ b/core/package.json
@@ -1,6 +1,6 @@
 {
    "name": "agentests",
-   "version": "1.0.1",
+   "version": "1.1.0",
    "description": "Linting for intelligence: plain-language rules compiled into engineered checks and proved on your own evals.",
    "keywords": [
        "ai-native",
diff --git a/core/src/AGENTS.md b/core/src/AGENTS.md
index 2d90b616..5bb11b5b 100644
--- a/core/src/AGENTS.md
+++ b/core/src/AGENTS.md
@@ -11,5 +11,6 @@ Orchestrators never walk the file system or call Git, except the scope orchestra
 `src/types.ts` holds only the shared building blocks and imports nothing from this package; each folder owns its types and schemas in its own `types.ts` and may import the shared ones.
 `assert/types.ts` owns `AgentTestResult`; `eval/types.ts` owns `AgentTestEvalResult` and `AgentTestEvalsResult`. Tests need no eval folders; their eval results are an empty list.
 Public re-exports live outside `src/`, in `core/index.ts` and `core/types.ts`; nothing in `src/` re-exports another folder's names.
+Progress goes through each instance's log callback, defaulting to `defaultLog` from `log.ts`; `Agentests` takes the callback in its optional third constructor argument and passes it to every orchestrator. No global console mutation. A no-op callback makes the instance quiet without changing results or engine inputs.
 The whole `test.yaml`, `eval.yaml`, and config schemas live in `src/loader/types.ts` because only the loader validates with them.
 Never make `src/types.ts` import from a folder (a circular import that fails at load time); exported names keep the `AgentTest*` prefix.
diff --git a/core/src/assert/index.ts b/core/src/assert/index.ts
index 4c82c6ed..67817b29 100644
--- a/core/src/assert/index.ts
+++ b/core/src/assert/index.ts
@@ -1,4 +1,6 @@
 import type { AgentTestEngines } from '../engines/types.ts';
+import { defaultLog } from '../log.ts';
+import type { AgentTestLog } from '../types.ts';
 import type { Source } from '../sources/index.ts';
 import type {
    AgentTestAssert,
@@ -11,7 +13,8 @@ import type {
 export class AssertOrchestrator {
    constructor(
        private readonly engines: AgentTestEngines,
-       private readonly config: AgentTestAssertConfig
+       private readonly config: AgentTestAssertConfig,
+       private readonly log: AgentTestLog = defaultLog
    ) {}

    /** One finding for every source and assertion of the Test's assert that fails, ordered by source, then assertion. */
@@ -19,14 +22,14 @@ export class AssertOrchestrator {
        assert: AgentTestAssert,
        sources: Source[]
    ): Promise<AgentTestFinding[]> => {
-       console.log(`Asserting ${sources.length} source(s) against ${assert.length} assertion(s)`);
+       this.log(`Asserting ${sources.length} source(s) against ${assert.length} assertion(s)`);
        const pairs = sources.flatMap((source) => assert.map((assertion) => ({ source, assertion })));
        const flagged = await Promise.all(
            pairs.map(({ source, assertion }) => this.isFlagged(source, assertion))
        );
        const findings = pairs.filter((_, index) => flagged[index]);
        const failed = new Set(findings.map(({ source }) => source)).size;
-       console.log(`${failed} of ${sources.length} source(s) failed`);
+       this.log(`${failed} of ${sources.length} source(s) failed`);
        return findings;
    };

@@ -39,7 +42,7 @@ export class AssertOrchestrator {
            (await this.failsGrep(source, assertion)) &&
            (await this.failsDecide(source, assertion)) &&
            (await this.failsReason(source, assertion));
-       if (flagged) console.log(`${source.path} has failed ${assertion.id}`);
+       if (flagged) this.log(`${source.path} has failed ${assertion.id}`);
        return flagged;
    };

diff --git a/core/src/engines/AGENTS.md b/core/src/engines/AGENTS.md
index 2894cbf5..a9e71ccc 100644
--- a/core/src/engines/AGENTS.md
+++ b/core/src/engines/AGENTS.md
@@ -6,4 +6,5 @@ Every engine is an `AgentTestEngine` from the folder's own `types.ts`, built by
 A list of criteria is an OR: return the best result among the alternatives (any glob matching, the highest grep count, the highest model score).
 Engines score what they are given. Engine order, early stopping, thresholds, and how many model calls to spend belong to the caller (the orchestrators).
 Return a bare number; richer metadata comes later, so do not add it yet.
+Both model settings accept optional positive-integer `concurrency`, validated only by the loader. Omission keeps unlimited concurrency. Each engine factory owns a limiter from `concurrency.ts`, sharing slots across all calls to that engine and wrapping each criterion's complete SDK invocation, including its SDK-managed retries. The decision and reasoning limits are independent, even when they use the same provider. Always release a slot on success or failure; preserve all criteria and their OR maximum, prompts, thresholds, and default retry behavior.
 `utils.ts` holds what the model engines share: `RUN_SYSTEM_PROMPT` and `providerSettings`, which reads the API key from the `AgentTestEnv` map passed to `createEngines` when an engine is created, and throws when it is missing or blank; models are still created on first use. `index.ts` only composes `createEngines` and is the single import for the folder; no file here imports from it.
diff --git a/core/src/engines/decide.ts b/core/src/engines/decide.ts
index 1c4bc632..30f5acad 100644
--- a/core/src/engines/decide.ts
+++ b/core/src/engines/decide.ts
@@ -1,6 +1,7 @@
 import { createOpenAI } from '@ai-sdk/openai';
 import { createTypeSafeAi } from '@ai-sdk/typesafe-ai';
 import { experimental_decide } from 'ai';
+import { createRequestLimiter } from './concurrency.ts';
 import { providerSettings, RUN_SYSTEM_PROMPT } from './utils.ts';
 import type { AgentTestDecisionConfig, AgentTestEngine, AgentTestEnv } from './types.ts';

@@ -11,6 +12,7 @@ export const createDecideEngine = (
 ): AgentTestEngine => {
    const provider = { ...settings };
    const options = providerSettings(provider, env);
+   const request = createRequestLimiter(provider.concurrency);
    let openai: ReturnType<typeof createOpenAI> | undefined;
    let typesafe: ReturnType<typeof createTypeSafeAi> | undefined;
    let model: ReturnType<ReturnType<typeof createOpenAI>['decisionModel']> | undefined;
@@ -21,19 +23,21 @@ export const createDecideEngine = (
                ? (openai ??= createOpenAI(options)).decisionModel(provider.model)
                : (typesafe ??= createTypeSafeAi(options)).decisionModel(provider.model));
        const scores = await Promise.all(
-           conditions.map(async (criterion) => {
-               const result = await experimental_decide({
-                   model: cachedModel,
-                   state: { input },
-                   questions: {
-                       criterion: {
-                           type: 'boolean',
-                           instructions: [RUN_SYSTEM_PROMPT, criterion].join('\n\n')
+           conditions.map((criterion) =>
+               request(async () => {
+                   const result = await experimental_decide({
+                       model: cachedModel,
+                       state: { input },
+                       questions: {
+                           criterion: {
+                               type: 'boolean',
+                               instructions: [RUN_SYSTEM_PROMPT, criterion].join('\n\n')
+                           }
                        }
-                   }
-               });
-               return result.answers.criterion.probability;
-           })
+                   });
+                   return result.answers.criterion.probability;
+               })
+           )
        );
        return Math.max(...scores);
    };
diff --git a/core/src/engines/reason.ts b/core/src/engines/reason.ts
index 7af8460a..28c4975f 100644
--- a/core/src/engines/reason.ts
+++ b/core/src/engines/reason.ts
@@ -1,6 +1,7 @@
 import { createAnthropic } from '@ai-sdk/anthropic';
 import { createOpenAI } from '@ai-sdk/openai';
 import { generateText, Output } from 'ai';
+import { createRequestLimiter } from './concurrency.ts';
 import { providerSettings, RUN_SYSTEM_PROMPT } from './utils.ts';
 import { AgentTestReasoningOutputSchema } from './types.ts';
 import type { AgentTestEngine, AgentTestEnv, AgentTestReasoningConfig } from './types.ts';
@@ -12,6 +13,7 @@ export const createReasonEngine = (
 ): AgentTestEngine => {
    const provider = { ...settings };
    const options = providerSettings(provider, env);
+   const request = createRequestLimiter(provider.concurrency);
    let openai: ReturnType<typeof createOpenAI> | undefined;
    let anthropic: ReturnType<typeof createAnthropic> | undefined;
    let model: ReturnType<ReturnType<typeof createOpenAI>['chat']> | undefined;
@@ -22,15 +24,17 @@ export const createReasonEngine = (
                ? (openai ??= createOpenAI(options)).chat(provider.model)
                : (anthropic ??= createAnthropic(options))(provider.model));
        const scores = await Promise.all(
-           conditions.map(async (criterion) => {
-               const result = await generateText({
-                   model: cachedModel,
-                   output: Output.object({ schema: AgentTestReasoningOutputSchema }),
-                   system: RUN_SYSTEM_PROMPT,
-                   prompt: JSON.stringify({ input, criterion })
-               });
-               return result.output.score;
-           })
+           conditions.map((criterion) =>
+               request(async () => {
+                   const result = await generateText({
+                       model: cachedModel,
+                       output: Output.object({ schema: AgentTestReasoningOutputSchema }),
+                       system: RUN_SYSTEM_PROMPT,
+                       prompt: JSON.stringify({ input, criterion })
+                   });
+                   return result.output.score;
+               })
+           )
        );
        return Math.max(...scores);
    };
diff --git a/core/src/engines/types.ts b/core/src/engines/types.ts
index e1432324..bb9bb891 100644
--- a/core/src/engines/types.ts
+++ b/core/src/engines/types.ts
@@ -6,7 +6,8 @@ import type { AgentTestParam } from '../types.ts';
 const ModelSchema = z.strictObject({
    url: z.url(),
    model: TextSchema,
-   apiKeyEnv: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Expected an environment variable name')
+   apiKeyEnv: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Expected an environment variable name'),
+   concurrency: z.number().int().positive().optional()
 });

 /** The config's `decision` section: the model behind the decide engine. */
diff --git a/core/src/eval/index.ts b/core/src/eval/index.ts
index 6dfd2f08..3b277691 100644
--- a/core/src/eval/index.ts
+++ b/core/src/eval/index.ts
@@ -1,6 +1,8 @@
 import type { AssertOrchestrator } from '../assert/index.ts';
 import { EVAL_FILE } from '../loader/index.ts';
 import type { AgentTestDefinition } from '../loader/types.ts';
+import { defaultLog } from '../log.ts';
+import type { AgentTestLog } from '../types.ts';
 import type { ScopeOrchestrator } from '../scope/index.ts';
 import type { SelectOrchestrator } from '../select/index.ts';
 import type { AgentTestEvalDefinition, AgentTestEvalResult, AgentTestOutcome } from './types.ts';
@@ -10,7 +12,8 @@ export class EvalOrchestrator {
    constructor(
        private readonly scope: ScopeOrchestrator,
        private readonly select: SelectOrchestrator,
-       private readonly assert: AssertOrchestrator
+       private readonly assert: AssertOrchestrator,
+       private readonly log: AgentTestLog = defaultLog
    ) {}

    /** The eval with its actual outcome, whether it matches the expected outcome, and findings. */
@@ -18,7 +21,7 @@ export class EvalOrchestrator {
        test: AgentTestDefinition,
        definition: AgentTestEvalDefinition
    ): Promise<AgentTestEvalResult> => {
-       console.log(`Eval ${definition.id}`);
+       this.log(`Eval ${definition.id}`);
        const sources = this.scope
            .runFolder(definition.root)
            .filter((source) => source.path !== EVAL_FILE);
@@ -26,7 +29,7 @@ export class EvalOrchestrator {
        const findings = selected.length ? await this.assert.run(test.assert, selected) : [];
        const actual: AgentTestOutcome = !selected.length ? 'skip' : findings.length ? 'fail' : 'pass';
        const matches = actual === definition.expect;
-       console.log(`${matches ? '✓' : '✗'} Expected ${definition.expect}, got ${actual}`);
+       this.log(`${matches ? '✓' : '✗'} Expected ${definition.expect}, got ${actual}`);
        return { eval: definition, actual, matches, findings };
    };
 }
diff --git a/core/src/index.ts b/core/src/index.ts
index 73117e4b..b3795bad 100644
--- a/core/src/index.ts
+++ b/core/src/index.ts
@@ -9,11 +9,13 @@ import type {
    AgentTestEvalsResult
 } from './eval/types.ts';
 import { loadDefinitions, loadEvalDefinitions } from './loader/index.ts';
+import { defaultLog } from './log.ts';
 import type { AgentTestConfig, AgentTestDefinition } from './loader/types.ts';
 import { ScopeOrchestrator } from './scope/index.ts';
 import type { AgentTestScope } from './scope/types.ts';
 import { SelectOrchestrator } from './select/index.ts';
 import type { Source } from './sources/index.ts';
+import type { AgentTestLog, AgentTestOptions } from './types.ts';

 /**
  * The main class: builds every component from the config and the environment, and coordinates a run or an eval.
@@ -25,13 +27,15 @@ export class Agentests {
    private readonly select: SelectOrchestrator;
    private readonly assert: AssertOrchestrator;
    private readonly evaluate: EvalOrchestrator;
+   private readonly log: AgentTestLog;

-   constructor(config: AgentTestConfig, env: AgentTestEnv) {
+   constructor(config: AgentTestConfig, env: AgentTestEnv, options: AgentTestOptions = {}) {
+       this.log = options.log ?? defaultLog;
        this.engines = createEngines(config, env);
-       this.scope = new ScopeOrchestrator(config.ignore);
-       this.select = new SelectOrchestrator(this.engines, config.select);
-       this.assert = new AssertOrchestrator(this.engines, config.assert);
-       this.evaluate = new EvalOrchestrator(this.scope, this.select, this.assert);
+       this.scope = new ScopeOrchestrator(config.ignore, this.log);
+       this.select = new SelectOrchestrator(this.engines, config.select, this.log);
+       this.assert = new AssertOrchestrator(this.engines, config.assert, this.log);
+       this.evaluate = new EvalOrchestrator(this.scope, this.select, this.assert, this.log);
    }

    /** Runs every Test, or only the one named `id`, over the sources in scope; one result per Test. */
@@ -59,7 +63,7 @@ export class Agentests {
        test: AgentTestDefinition,
        sources: Source[]
    ): Promise<AgentTestResult> => {
-       console.log(`Test ${test.id}`);
+       this.log(`Test ${test.id}`);
        const selected = await this.select.run(test.select, sources);
        const findings = await this.assert.run(test.assert, selected);
        return { test, findings };
@@ -70,7 +74,7 @@ export class Agentests {
        test: AgentTestDefinition,
        evals: AgentTestEvalDefinition[]
    ): Promise<AgentTestEvalsResult> => {
-       console.log(`Test ${test.id}`);
+       this.log(`Test ${test.id}`);
        const results: AgentTestEvalResult[] = [];
        for (const definition of evals) results.push(await this.evaluate.run(test, definition));
        return { test, evals: results };
diff --git a/core/src/scope/index.ts b/core/src/scope/index.ts
index cbd8ae83..2a332764 100644
--- a/core/src/scope/index.ts
+++ b/core/src/scope/index.ts
@@ -2,6 +2,8 @@ import { execFileSync } from 'node:child_process';
 import { lstatSync, readdirSync } from 'node:fs';
 import { join, posix, sep } from 'node:path';
 import { Minimatch } from 'minimatch';
+import { defaultLog } from '../log.ts';
+import type { AgentTestLog } from '../types.ts';
 import { DirectorySource, FileSource } from '../sources/index.ts';
 import type { Source } from '../sources/index.ts';
 import type { AgentTestScope } from './types.ts';
@@ -19,19 +21,22 @@ const IGNORE_OPTIONS = { dot: true, platform: 'linux' } as const;
 export class ScopeOrchestrator {
    private readonly globs: Minimatch[];

-   constructor(private readonly ignore: string[]) {
+   constructor(
+       private readonly ignore: string[],
+       private readonly log: AgentTestLog = defaultLog
+   ) {
        this.globs = this.ignore.map((pattern) => new Minimatch(pattern, IGNORE_OPTIONS));
    }

    /** Every file Git lists for the scope that counts, and its ancestor directories, sorted by path. */
    public readonly run = (scope: AgentTestScope): Source[] => {
-       console.log(`Scoping ${scope.kind} sources`);
+       this.log(`Scoping ${scope.kind} sources`);
        return this.toSources(this.listFiles(scope), '.');
    };

    /** Every file under `folder` that counts, and its ancestor directories, sorted by path, with `folder` as the repository root; needs no Git; nothing behind a directory symlink counts. */
    public readonly runFolder = (folder: string): Source[] => {
-       console.log(`Scoping sources in ${folder}`);
+       this.log(`Scoping sources in ${folder}`);
        const paths = readdirSync(folder, { recursive: true, encoding: 'utf8' });
        return this.toSources(
            paths.map((path) => path.split(sep).join(posix.sep)),
@@ -46,7 +51,7 @@ export class ScopeOrchestrator {
        const sources = all.map((path) =>
            files.has(path) ? new FileSource(path, root) : new DirectorySource(path, root)
        );
-       console.log(`${sources.length} source(s) in scope`);
+       this.log(`${sources.length} source(s) in scope`);
        return sources;
    };

diff --git a/core/src/select/index.ts b/core/src/select/index.ts
index 57d43049..ed343329 100644
--- a/core/src/select/index.ts
+++ b/core/src/select/index.ts
@@ -1,4 +1,6 @@
 import type { AgentTestEngines } from '../engines/types.ts';
+import { defaultLog } from '../log.ts';
+import type { AgentTestLog } from '../types.ts';
 import type { Source } from '../sources/index.ts';
 import type { AgentTestSelect, AgentTestSelectConfig } from './types.ts';

@@ -6,7 +8,8 @@ import type { AgentTestSelect, AgentTestSelectConfig } from './types.ts';
 export class SelectOrchestrator {
    constructor(
        private readonly engines: AgentTestEngines,
-       private readonly config: AgentTestSelectConfig
+       private readonly config: AgentTestSelectConfig,
+       private readonly log: AgentTestLog = defaultLog
    ) {}

    /** The sources the Test's select keeps, in input order; every source when the Test has no select. */
@@ -14,12 +17,12 @@ export class SelectOrchestrator {
        select: AgentTestSelect | undefined,
        sources: Source[]
    ): Promise<Source[]> => {
-       console.log(`Selecting among ${sources.length} source(s)`);
+       this.log(`Selecting among ${sources.length} source(s)`);
        const flagged = select
            ? await Promise.all(sources.map((source) => this.isFlagged(source, select)))
            : sources.map(() => true);
        const selected = sources.filter((_, index) => flagged[index]);
-       console.log(`${selected.length} of ${sources.length} source(s) selected`);
+       this.log(`${selected.length} of ${sources.length} source(s) selected`);
        return selected;
    };

@@ -32,7 +35,7 @@ export class SelectOrchestrator {
            (await this.passesGlob(source, select)) &&
            (await this.passesGrep(source, select)) &&
            (await this.passesDecide(source, select));
-       if (flagged) console.log(`${source.path} has been selected`);
+       if (flagged) this.log(`${source.path} has been selected`);
        return flagged;
    };

diff --git a/core/src/types.ts b/core/src/types.ts
index 9b034c7c..30e10baf 100644
--- a/core/src/types.ts
+++ b/core/src/types.ts
@@ -1,5 +1,13 @@
 import { z } from 'zod';

+/** Receives one human-readable progress message. */
+export type AgentTestLog = (message: string) => void;
+
+/** Per-instance runtime behavior; omit log for console output, or pass a no-op for quiet operation. */
+export interface AgentTestOptions {
+   log?: AgentTestLog;
+}
+
 /** Lowercase kebab-case identifier. */
 export const IdSchema = z
    .string()
diff --git a/core/tests/AGENTS.md b/core/tests/AGENTS.md
index 4aa23c8d..720aed6c 100644
--- a/core/tests/AGENTS.md
+++ b/core/tests/AGENTS.md
@@ -84,6 +84,7 @@ await expect(engines.decide('text', 'Is it fine?')).rejects.toThrow('no implemen
 `agentests.ts`

 - `class StubAgentests extends Agentests`, `constructor(config: AgentTestConfig, stubs: Partial<AgentTestEngines> = {})`: the real `Agentests` built with `ENV`, so `config` must name `DECISION_KEY` and `REASONING_KEY`; the given engines replace the real ones, `decide` and `reason` not given reject, `glob` and `grep` stay real unless given.
+- `StubAgentests` also accepts optional third `AgentTestOptions`, passed to `Agentests`, for per-instance progress capture or quiet logging.

 ```ts
 const tests = new StubAgentests(validConfig(), { decide: async () => 0 });
diff --git a/core/tests/helpers/agentests.ts b/core/tests/helpers/agentests.ts
index 6cb840d3..b3a78137 100644
--- a/core/tests/helpers/agentests.ts
+++ b/core/tests/helpers/agentests.ts
@@ -2,6 +2,7 @@ import { Agentests } from '../../src/index.ts';
 import { ENV } from './fixtures.ts';
 import type { AgentTestEngine, AgentTestEngines } from '../../src/engines/types.ts';
 import type { AgentTestConfig } from '../../src/loader/types.ts';
+import type { AgentTestOptions } from '../../src/types.ts';

 /** An engine standing in for a model engine nobody stubbed: rejects instead of reaching a model. */
 const unreachable =
@@ -12,8 +13,12 @@ const unreachable =

 /** The real `Agentests` built with `ENV`, with the given engines stubbed; decide and reason that are not given reject, glob and grep stay real unless given. */
 export class StubAgentests extends Agentests {
-   constructor(config: AgentTestConfig, stubs: Partial<AgentTestEngines> = {}) {
-       super(config, ENV);
+   constructor(
+       config: AgentTestConfig,
+       stubs: Partial<AgentTestEngines> = {},
+       options: AgentTestOptions = {}
+   ) {
+       super(config, ENV, options);
        Object.assign(
            this.engines,
            { decide: unreachable('decide'), reason: unreachable('reason') },
diff --git a/core/tests/loader/config/validate.test.ts b/core/tests/loader/config/validate.test.ts
index 354abd6e..4450dac1 100644
--- a/core/tests/loader/config/validate.test.ts
+++ b/core/tests/loader/config/validate.test.ts
@@ -119,6 +119,22 @@ describe('validateConfig', () => {
        });
    });

+   describe.each(['decision', 'reasoning'] as const)('the %s concurrency', (section) => {
+       test.each([1, 4, 100])('accepts %p active requests', (concurrency) => {
+           expect(validateConfig(withModel(section, { concurrency }))[section].concurrency).toBe(
+               concurrency
+           );
+       });
+       test.each([0, -1, 1.5, '4', null, Infinity])('rejects %p', (concurrency) => {
+           expect(() => validateConfig(withModel(section, { concurrency }))).toThrow(
+               `${section}.concurrency: `
+           );
+       });
+       test('omission preserves an unlimited configuration without inserting a default', () => {
+           expect(validateConfig(validConfig())[section]).not.toHaveProperty('concurrency');
+       });
+   });
+
    test.each([
        ['at the top level', { ...validConfig(), extra: true }, 'extra: Unknown field'],
        [
diff --git a/core/types.ts b/core/types.ts
index f6a27b89..817a0b38 100644
--- a/core/types.ts
+++ b/core/types.ts
@@ -1,4 +1,4 @@
-export type { AgentTestParam } from './src/types.ts';
+export type { AgentTestLog, AgentTestOptions, AgentTestParam } from './src/types.ts';
 export type {
    AgentTestConfig,
    AgentTestDefinition,
diff --git a/core/src/engines/concurrency.ts b/core/src/engines/concurrency.ts
new file mode 100644
index 00000000..4c03d4b7
--- /dev/null
+++ b/core/src/engines/concurrency.ts
@@ -0,0 +1,16 @@
+/** Bounds active SDK requests within one engine, sharing slots across calls and criterion alternatives. */
+export const createRequestLimiter = (concurrency = Infinity) => {
+   let active = 0;
+   const waiting: (() => void)[] = [];
+   return async <T>(request: () => Promise<T>): Promise<T> => {
+       if (active >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
+       else active += 1;
+       try {
+           return await request();
+       } finally {
+           const next = waiting.shift();
+           if (next) next();
+           else active -= 1;
+       }
+   };
+};
diff --git a/core/src/log.ts b/core/src/log.ts
new file mode 100644
index 00000000..9250a955
--- /dev/null
+++ b/core/src/log.ts
@@ -0,0 +1,4 @@
+import type { AgentTestLog } from './types.ts';
+
+/** The default progress logger; resolve console.log when called so existing console consumers keep working. */
+export const defaultLog: AgentTestLog = (message) => console.log(message);
diff --git a/core/tests/agentests/logging.test.ts b/core/tests/agentests/logging.test.ts
new file mode 100644
index 00000000..dcda443f
--- /dev/null
+++ b/core/tests/agentests/logging.test.ts
@@ -0,0 +1,63 @@
+import { describe, expect, spyOn, test } from 'bun:test';
+import { StubAgentests } from '../helpers/agentests.ts';
+import { testFolder, validConfig, validTest } from '../helpers/fixtures.ts';
+import { inTempRepo } from '../helpers/git.ts';
+import { Source } from '../../src/sources/index.ts';
+
+/** Compare results by their data, since independently scoped sources have distinct open callbacks. */
+const data = (result: unknown): string =>
+   JSON.stringify(result, (_key, value) =>
+       value instanceof Source ? { path: value.path, kind: value.kind, content: value.open() } : value
+   );
+
+const files = {
+   ...testFolder(validTest(), {
+       failure: { expect: 'fail', files: { 'src/a.ts': 'TODO' } }
+   }),
+   'src/a.ts': 'TODO'
+};
+
+describe('per-instance progress logging', () => {
+   test('default and custom logging report identical run and eval progress and results', async () => {
+       await inTempRepo(files, async () => {
+           const messages: string[] = [];
+           const custom = new StubAgentests(validConfig(), {}, { log: (line) => messages.push(line) });
+           const original = console.log;
+           const logged = spyOn(console, 'log').mockImplementation(() => {});
+           try {
+               const defaults = new StubAgentests(validConfig());
+               const expectedRun = await defaults.run({ kind: 'all' });
+               const expectedEvals = await defaults.eval();
+               const expectedMessages = logged.mock.calls.map(([line]) => line);
+               logged.mockClear();
+               expect(data(await custom.run({ kind: 'all' }))).toBe(data(expectedRun));
+               expect(data(await custom.eval())).toBe(data(expectedEvals));
+               expect(messages).toEqual(expectedMessages);
+               expect(logged).not.toHaveBeenCalled();
+               expect(messages.some((line) => line.startsWith('Scoping '))).toBe(true);
+               expect(messages).toContain('src/a.ts has failed no-todo');
+               expect(messages).toContain('✓ Expected fail, got fail');
+           } finally {
+               logged.mockRestore();
+           }
+           expect(console.log).toBe(original);
+       });
+   });
+
+   test('quiet and captured instances stay isolated when their runs overlap', async () => {
+       await inTempRepo(files, async () => {
+           const captured: string[] = [];
+           const quiet = new StubAgentests(validConfig(), {}, { log: () => {} });
+           const verbose = new StubAgentests(validConfig(), {}, { log: (line) => captured.push(line) });
+           const original = console.log;
+           const [quietResult, verboseResult] = await Promise.all([
+               quiet.run({ kind: 'all' }),
+               verbose.run({ kind: 'all' })
+           ]);
+           expect(data(quietResult)).toBe(data(verboseResult));
+           expect(captured.filter((line) => line === 'Test no-todo')).toHaveLength(1);
+           expect(captured.filter((line) => line === 'src/a.ts has failed no-todo')).toHaveLength(1);
+           expect(console.log).toBe(original);
+       });
+   });
+});
diff --git a/core/tests/engines/concurrency.test.ts b/core/tests/engines/concurrency.test.ts
new file mode 100644
index 00000000..39c6b40a
--- /dev/null
+++ b/core/tests/engines/concurrency.test.ts
@@ -0,0 +1,71 @@
+import { describe, expect, test } from 'bun:test';
+import { createRequestLimiter } from '../../src/engines/concurrency.ts';
+
+/** A manually completed request, avoiding timing-dependent concurrency checks. */
+const deferred = () => {
+   let resolve!: () => void;
+   const promise = new Promise<void>((done) => {
+       resolve = done;
+   });
+   return { promise, resolve };
+};
+
+describe('model request slots', () => {
+   test('bounds overlapping request groups and preserves their returned scores', async () => {
+       const request = createRequestLimiter(2);
+       const gates = Array.from({ length: 4 }, deferred);
+       const started: number[] = [];
+       const run = (index: number) =>
+           request(async () => {
+               started.push(index);
+               await gates[index]!.promise;
+               return index / 4;
+           });
+       const first = Promise.all([run(0), run(1)]);
+       const second = Promise.all([run(2), run(3)]);
+       expect(started).toEqual([0, 1]);
+       gates[1]!.resolve();
+       await gates[1]!.promise;
+       await Promise.resolve();
+       await Promise.resolve();
+       expect(started).toEqual([0, 1, 2]);
+       for (const gate of gates) gate.resolve();
+       expect(await first).toEqual([0, 0.25]);
+       expect(await second).toEqual([0.5, 0.75]);
+   });
+
+   test('releases a slot after rejection and synchronous failure', async () => {
+       const request = createRequestLimiter(1);
+       const gate = deferred();
+       const failed = request(async () => {
+           await gate.promise;
+           throw new Error('rejected');
+       });
+       const rejected = failed.catch((error: Error) => error.message);
+       const thrown = request(() => {
+           throw new Error('thrown');
+       });
+       const synchronous = thrown.catch((error: Error) => error.message);
+       const succeeds = request(async () => 0.75);
+       gate.resolve();
+       expect(await rejected).toBe('rejected');
+       expect(await synchronous).toBe('thrown');
+       expect(await succeeds).toBe(0.75);
+   });
+
+   test('omitting the limit starts every request immediately', async () => {
+       const request = createRequestLimiter();
+       const gate = deferred();
+       let started = 0;
+       const requests = Array.from({ length: 20 }, () =>
+           request(async () => {
+               started += 1;
+               await gate.promise;
+               return 1;
+           })
+       );
+       expect(started).toBe(20);
+       gate.resolve();
+       expect(await Promise.all(requests)).toEqual(Array(20).fill(1));
+   });
+});
diff --git a/core/tests/engines/model-concurrency.test.ts b/core/tests/engines/model-concurrency.test.ts
new file mode 100644
index 00000000..34f4d30f
--- /dev/null
+++ b/core/tests/engines/model-concurrency.test.ts
@@ -0,0 +1,64 @@
+import { describe, expect, test } from 'bun:test';
+import { setImmediate } from 'node:timers/promises';
+import { createDecideEngine } from '../../src/engines/decide.ts';
+import { createReasonEngine } from '../../src/engines/reason.ts';
+import { ENV, validConfig } from '../helpers/fixtures.ts';
+
+describe.each(['decision', 'reasoning'] as const)('%s request concurrency', (kind) => {
+   test.each([undefined, 1, 2])(
+       'limits each criterion across engine calls with concurrency %p and retains OR scores',
+       async (concurrency) => {
+           const original = globalThis.fetch;
+           let active = 0;
+           let maximum = 0;
+           const bodies: string[] = [];
+           globalThis.fetch = (async (_url, init) => {
+               const body = String(init?.body);
+               bodies.push(body);
+               active += 1;
+               maximum = Math.max(maximum, active);
+               try {
+                   // Yield locally so concurrently active requests overlap; no network is reached.
+                   await setImmediate();
+                   const score = Number(/score-(0\.\d)/.exec(body)?.[1]);
+                   const response =
+                       kind === 'decision'
+                           ? { answers: [{ type: 'predicate', name: 'criterion', probability: score }] }
+                           : {
+                                   id: 'offline',
+                                   object: 'chat.completion',
+                                   created: 0,
+                                   model: 'offline',
+                                   choices: [
+                                       {
+                                           index: 0,
+                                           message: { role: 'assistant', content: JSON.stringify({ score }) },
+                                           finish_reason: 'stop'
+                                       }
+                                   ]
+                               };
+                   return Response.json(response);
+               } finally {
+                   active -= 1;
+               }
+           }) as typeof fetch;
+           try {
+               const config = validConfig();
+               const engine =
+                   kind === 'decision'
+                       ? createDecideEngine({ ...config.decision, concurrency }, ENV)
+                       : createReasonEngine({ ...config.reasoning, concurrency }, ENV);
+               const results = await Promise.all([
+                   engine('first input', ['score-0.2', 'score-0.8']),
+                   engine('second input', ['score-0.6', 'score-0.4'])
+               ]);
+               expect(results).toEqual([0.8, 0.6]);
+               expect(maximum).toBe(concurrency ?? 4);
+               expect(bodies).toHaveLength(4);
+               expect(active).toBe(0);
+           } finally {
+               globalThis.fetch = original;
+           }
+       }
+   );
+});
````
