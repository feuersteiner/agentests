# v3 local handoff

This directory preserves the v3 work as an experimental archive for local review.
The handoff patch changes only `benchmark/v3/`. It does not change the library,
its version, root workspace files, frozen v2 fixtures or repository instructions.
There is no v4 implementation in this handoff.

## Contents

- `run/protocol.md`: controlled logging/scheduling pilot design.
- `run/isolated-judge.md`: separate isolated-judge treatment and calibration method.
- `workbench/`: plans, runners, provider adapters, telemetry, diagnostics, CLI
  commands, isolated Test compiler and offline tests.
- `LIBRARY-CHANGES.md`: explanation of the previously implemented library hooks.
- `LIBRARY-CHANGES-SNIPPETS.md`: their complete source/test diff, inside Markdown
  only. None of that code is applied to `core/` by this patch.
- `WORKSPACE-INTEGRATION.md`: optional root integration notes and historical diff.

## Compatibility of the archived source

The executable workbench sources are preserved as they were used in the v3
experiment, including calls to the proposed logging hooks. The stock library at
the source base does not provide the extra logger constructor parameter or the
proposed per-engine concurrency configuration. Those library proposals are
documented for review, and have been removed from the actual library files.

Consequently, historical successful checks do not establish that every archived
v3 command works unchanged against stock core. In particular, `gate.ts` and
`isolated-judge.ts` call `AssertOrchestrator` with a third logger argument. Stock
core accepts two arguments. The quiet A/B/C comparison cannot claim quiet
execution without a compatible hook or a separately designed benchmark adapter.
Do not silence this mismatch with a type cast and assume the behavior exists.

Review the notes before integrating or executing the archive. Choosing whether
to implement a library proposal or redesign the benchmark boundary remains a
local decision. Applying this handoff performs neither action and starts no
model calls. Stock library source and package metadata remain unchanged.

## Apply locally

The patch is based on commit:

`4055525ab68e37bf23c5db63f4794b8624655e4d`

```sh
git apply --check /path/to/v3-only.patch
git apply /path/to/v3-only.patch
```

The source ZIP contains the same `benchmark/v3/` tree and can instead be extracted
at the repository root. Use one method. Existing local v3 files may conflict;
inspect them before applying. No commit or push is performed by the handoff.

## Private evidence

Measured reports and the completed calibration are delivered separately in
`v3-private-evidence.zip`. They are excluded from the source patch and source ZIP.
Keep that archive private. It contains reports, the frozen run index and all
48 generated native Test files, with no credential files or dependency caches.

The private archive includes historical reports from different stages of the
work. Early investigation notes predate the later paid isolated-judge run.
The later `ISOLATED-JUDGE-RESULTS.md` describes that calibration; the prior full
validation used the proposed library hooks, before their removal from source.

No new benchmark run is part of packaging this handoff.
