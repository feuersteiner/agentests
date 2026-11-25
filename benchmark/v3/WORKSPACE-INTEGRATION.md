# Optional local workspace integration

The v3-only handoff does not modify root package.json, bun.lock, README.md or
repository instructions. These are optional manual integration snippets.

Add benchmark/v3/workbench to the root workspaces array to install/check this
workbench with the existing workspaces. Add agentests-controlled-pilot to the
explicit root test filters. After any chosen integration, regenerate the lock
with the project Bun version. Keep the installed core version unchanged unless
you independently choose to implement a library proposal.

```json
"workspaces": [
  "benchmark/v1/workbench",
  "benchmark/v2/workbench",
  "benchmark/v3/workbench",
  "core",
  "video"
]
```

The source package's scripts include validate, test, check, judge:validate and
judge:run. Paid run commands require explicit invocation; patch application does
not execute them.

The complete historical root integration diff is retained below for review.
It includes the historical 1.1.0 lock entry and API documentation; do not apply
those parts to claim an API the stock library does not provide.

```diff
diff --git a/README.md b/README.md
index 7794d51b..ea8da545 100644
--- a/README.md
+++ b/README.md
@@ -183,9 +183,22 @@ const results = await new Agentests(loadConfig(), process.env).run({ kind: 'stag
 Each result is a Test with its findings, and the types are under `agentests/types`. The library
 never reads `.env` or `process.env` itself: pass the environment in.

+Version 1.1 adds optional per-instance progress logging. Pass `{ log: () => {} }` as the
+third constructor argument to silence progress, or `{ log: message => diagnostics.push(message) }`
+to collect it. Results and model inputs are unchanged; the default still prints progress.
+Exposed orchestrators accept the same callback as their last constructor argument.
+
+The `decision` and `reasoning` config sections also accept an optional positive integer
+`concurrency`. It bounds active criterion requests across calls to that engine instance,
+including time spent in SDK retries. The two engines have separate limits, even when they
+use the same provider. Omitting it preserves existing concurrency. This controls request
+scheduling; it does not change criteria, thresholds, feedback or the numerical engine contract.
+
 ## Repository structure

 - [`core`](core): the npm package, with the [CLI](core/cli) and the library in [`src`](core/src).
+- [`benchmark`](benchmark): versioned methods and offline harnesses, including the
+  [v3 controlled runtime pilot](benchmark/v3/README.md); measured evidence stays private.
 - [`docs`](docs): use cases, the source of the planned documentation site.
 - [`library`](library): placeholder for the planned community library of shared Tests.
 - [`video`](video): the SvelteKit app that renders the demo film.
diff --git a/benchmark/AGENTS.md b/benchmark/AGENTS.md
index 14e65b07..045831ed 100644
--- a/benchmark/AGENTS.md
+++ b/benchmark/AGENTS.md
@@ -10,7 +10,8 @@ Normal clones/checks never initialize it. Never upload evidence to a public remo

 `v1` is the historical skill-versus-commit-gate experiment, previously called
 `benchmark-v2`. `v2` contains the frozen original five-case evaluator pilot and a
-separate ten-situation complex support suite and six-arm agent study. Execution
+separate ten-situation complex support suite and six-arm agent study. `v3` reuses
+those unchanged inputs for a controlled logging and scheduling pilot. Execution
 history and measured evidence remain private; core keeps its binary runtime
 contract.

@@ -20,7 +21,7 @@ contract.
   explicit packaging CLI (`evidence.py`) and offline privacy/preservation tests
   (`evidence-test.py`). Tooling lives here; exported evidence belongs in `private/`.
 - `private/`: optional private evidence submodule; never initialized by normal checks.
-- `v1/` and `v2/`: version-specific methods, pilots, run plans and workbench sources.
+- `v1/`, `v2/` and `v3/`: version-specific methods, pilots, run plans and workbench sources.

 ## Preservation and privacy

@@ -62,3 +63,9 @@ contract.
 - The v1 agent loop requires Linux/root for `unshare --mount`, authenticated
   Claude Code, built `core/dist` and decision credentials. Offline checks work
   on macOS. Keys stay in the harness process, outside agent workspaces/transcripts.
+- v3: run workbench `check`, `test`, `validate` and CLI help offline. `pilot`
+  makes paid calls and requires explicit paid-run authorization and confirmation
+  of an externally enforced spending cap; validation never authorizes inference.
+  Read `v3/run/protocol.md`. Keep A/B/C feedback and model packets identical;
+  evaluate criteria, threshold or feedback changes as separate treatments.
+  Legacy disagreement reports and blinded review exports remain private.
diff --git a/benchmark/README.md b/benchmark/README.md
index e5a7de3b..a4b65fc1 100644
--- a/benchmark/README.md
+++ b/benchmark/README.md
@@ -8,6 +8,7 @@ belong in the optional [private evidence repository](evidence/EVIDENCE.md).
 | ------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
 | v1      | Skill versus commit gate, with an agent loop and independent judge.                                                           | [Method](v1/README.md), [optional fixture ZIP](v1/ARCHIVE.md) |
 | v2      | Original binary five-case evaluator pilot and a separate ten-situation, six-arm agent study with Luna and TypeSafe-Jev gates. | [Methods](v2/README.md)                                       |
+| v3      | Controlled logging and scheduling follow-up, preserving v2 task and judgment semantics.                                       | [Protocol](v3/run/protocol.md), [harness](v3/README.md)       |

 The historical name `benchmark-v2` refers to v1. The new v2 is a separate
 experiment. Normal clones and offline checks require neither private access nor
diff --git a/bun.lock b/bun.lock
index 3c5b9f1f..f37a1897 100644
--- a/bun.lock
+++ b/bun.lock
@@ -39,9 +39,19 @@
         "typescript": "^6.0.3",
       },
     },
+    "benchmark/v3/workbench": {
+      "name": "agentests-controlled-pilot",
+      "dependencies": {
+        "agentests": "workspace:*",
+      },
+      "devDependencies": {
+        "@types/bun": "^1.4.4",
+        "typescript": "^6.0.3",
+      },
+    },
     "core": {
       "name": "agentests",
-      "version": "1.0.1",
+      "version": "1.1.0",
       "bin": {
         "agentests": "./dist/cli/index.js",
       },
@@ -247,6 +257,8 @@

     "agentests-benchmarks": ["agentests-benchmarks@workspace:benchmark/v1/workbench"],

+    "agentests-controlled-pilot": ["agentests-controlled-pilot@workspace:benchmark/v3/workbench"],
+
     "ai": ["ai@7.0.162", "", { "dependencies": { "@ai-sdk/gateway": "4.0.135", "@ai-sdk/provider": "4.0.35", "@ai-sdk/provider-utils": "5.0.74" }, "peerDependencies": { "zod": "^3.25.76 || ^4.1.8" } }, "sha512-NPzL6/GmjjPwhzM1kGP9O60TfJ3uXV4Z4A/ztljxcJFAmRAFAjgk5mAHaikk3sE8NQo4NbRCiS+DgHinE2d0sQ=="],

     "ajv": ["ajv@6.15.0", "", { "dependencies": { "fast-deep-equal": "^3.1.1", "fast-json-stable-stringify": "^2.0.0", "json-schema-traverse": "^0.4.1", "uri-js": "^4.2.2" } }, "sha512-fgFx7Hfoq60ytK2c7DhnF8jIvzYgOMxfugjLOSMHjLIPgenqa7S7oaagATUq99mV6IYvN2tRmC0wnTYX6iPbMw=="],
diff --git a/package.json b/package.json
index b46fc86c..90940fc6 100644
--- a/package.json
+++ b/package.json
@@ -7,6 +7,7 @@
    "workspaces": [
        "benchmark/v1/workbench",
        "benchmark/v2/workbench",
+       "benchmark/v3/workbench",
        "core",
        "video"
    ],
@@ -14,7 +15,7 @@
        "prepare": "lefthook install",
        "build": "cp README.md LICENSE core/ && bun --no-env-file run --cwd core build",
        "check": "bun --no-env-file run --workspaces --if-present check",
-       "test": "bun --no-env-file run --cwd core test && bun --no-env-file run --filter agentests-benchmarks --filter agentests-backend-pilot --filter video --if-present test",
+       "test": "bun --no-env-file run --cwd core test && bun --no-env-file run --filter agentests-benchmarks --filter agentests-backend-pilot --filter agentests-controlled-pilot --filter video --if-present test",
        "test:models": "bun run build && cd core/tests/models && node --env-file-if-exists=../../../.env ../../dist/cli/index.js eval",
        "lint": "bun --no-env-file run format:check && eslint .",
        "pack": "bun --no-env-file run build && cd core && npm pack",
@@ -24,7 +25,8 @@
        "benchmark:pick": "bun run --cwd benchmark/v1/workbench pilot:pick",
        "benchmark:pilot": "bun run --cwd benchmark/v1/workbench pilot",
        "benchmark:prove": "bun run --cwd benchmark/v1/workbench prove",
-       "benchmark:restore": "python3 -B benchmark/v1/archive.py restore"
+       "benchmark:restore": "python3 -B benchmark/v1/archive.py restore",
+       "benchmark:v3:validate": "bun --no-env-file run --cwd benchmark/v3/workbench validate"
    },
    "devDependencies": {
        "@eslint/js": "^10.0.1",
```
