# Report: cache-key-includes-tenant-and-all-inputs

Status: done. Entry at `benchmarks/dataset/cache-key-includes-tenant-and-all-inputs/`. `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture; the fixture's 18 `bun test` tests pass as shipped; no caches, `.git` or `node_modules`; no skill placeholder (`$` + digit or `$ARGUMENTS`); the rule text is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md` and nowhere in `fixture/`. Only files under the entry's folder are new. Five proving rounds; the Test and evals are frozen as of round 5.

## Final rule text

An application cache key must include the tenant (user, organisation, namespace) and every other input that changes the result, and a cache read must confirm the entry belongs to the caller's tenant.

- In Tidewell's analytics API the tenant is the organisation: `ctx.orgId` on the `RequestContext` a request is handled with, or the `orgId` a pipeline runs for.
- Results depend on the caller's context as well as on the arguments. `runReport` filters rows by `ctx.orgId`, masks columns by `ctx.roles` and formats money and dates by `ctx.locale`, as `src/reports/queries.ts` applies them, and a dashboard is rendered from `runReport` results. `search` returns only the organisation's documents and leaves out restricted ones unless `ctx.roles` includes `admin`. A pipeline step's output depends on its organisation's data, its `op` and `args`, and the outputs of the steps it reads, which those steps' ids do not identify.
- An entry confirms its tenant when it is stored with the organisation id it was computed for and the read compares that id with the caller's before using the entry, treating a different id as a miss.

The first sentence is the research `rule`. The second bullet carries the triage's `policy_facts` (runReport's dependence on orgId, roles and locale) and extends it to the three other task subjects (dashboards, search, pipelines), which the triage left out because its fixture only covered reports. The third bullet settles what "confirm the entry belongs to the caller's tenant" means (stored orgId compared on read), following the advisory's "ownership must be enforced independently on cache writes and reads".

## Fixture

`tidewell-analytics`, a dependency-free Bun/TypeScript reporting API for the fictional Tidewell, two organisations (`org_lumen`, EUR; `org_brook`, GBP): `src/context.ts` (`RequestContext` with orgId, userId, roles, locale), `src/db.ts` (in-memory warehouse with orders, documents, dashboards and a warehouse-query counter), `src/cache.ts` (Redis JSON get/set helpers over a `RedisClient`, with a `MemoryRedis` stand-in; unused when the agent starts), `src/reports/queries.ts` (org filter, role masking, locale formatting), `src/reports/service.ts` (`runReport`), `src/search/service.ts`, `src/dashboards/render.ts`, `src/pipelines/runner.ts` (load/filter/sum steps and a template pipeline), `src/routes.ts` (`handle(ctx, url)`), README, CHANGELOG, package.json, `.gitignore`, and three test files. Seeded chores: `to` date exclusive in `fetchOrders`; `GET /search` without `q` throws; a missing pipeline input crashes with a TypeError; `GET /dashboards/<unknown>` throws (500).

## Test (gate/test.yaml)

select: glob `src/**/!(*.test|*.spec).ts`, grep `[Cc]ach(e|ing)|[Rr]edis|(?<!use)[Mm]emo(?!r)` (the look-arounds keep `in-memory`, `memory` and React's `useMemo` out). Only `src/cache.ts` of the shipped files is selected.

- `tenant-in-key` (no grep)
  - decide: Wherever this file stores a computed result in a cache or memo (Redis, a get/set helper over it, or a Map or object kept between calls) or looks one up there, and that result is computed for one organisation, user or namespace, the key it uses contains that tenant's id, such as ctx.orgId or the orgId a pipeline runs for, written into the key string or included in an object or list that is hashed or serialised into the key. A result is computed for one tenant when the code that produces it is given a request context (ctx) or an organisation, user, account or namespace id, or reads that tenant's data. A file that builds no cache key passes, and so do a generic cache helper or class that only uses the keys its callers pass in and a cache of values that are the same for every tenant, such as a product catalogue or exchange rates.
- `all-inputs-in-key`
  - grep: `\bctx\b|[Oo]rg(ani[sz]ation)?I[Dd]|[Tt]enant|[Uu]ser(Id|ID)|[Aa]ccount(Id|ID)|[Ww]orkspace(Id|ID)|[Nn]amespace`
  - decide (two alternatives):
    1. Each cache or memo key built in this file holds the inputs listed here for what is stored under it; the tenant is checked separately. An input is held when it is written into the key, included in an object or list that is serialised or hashed into the key, or represented there by a value computed from it; the roles, for example, are held when the key has the roles or a value computed from them, such as whether the caller is an admin. One report, cached inside runReport or around a single call to it: the report id, the params, ctx.roles and ctx.locale. A rendered dashboard: the dashboard id, ctx.roles and ctx.locale; the dashboard id stands for its widgets' report ids and params. Search results: the query and ctx.roles. A pipeline step's output: the step's op, its args and its input rows (the rows, a hash of them or the keys they were cached under); the ids of the steps it reads are not its input rows. Anything else: the arguments of the function that computes it, other than the request context and the tenant id; an organisation's rows read from the warehouse, for example, need nothing beyond the tenant. A file that builds no cache key passes.
    2. This file is not from Tidewell's analytics API: it uses no RequestContext and defines or calls none of runReport, search, renderDashboard, runPipeline and runStep.
- `read-checks-tenant`
  - grep: same tenant-token grep as above
  - decide: Wherever this file reads a cached or memoised result that was computed for one organisation, user or namespace and then uses or returns it, it first confirms that the entry belongs to the caller's tenant: the entry was stored together with the tenant id it was computed for (for example an orgId field next to the value) and the read compares that stored id with the caller's (for example hit.orgId === ctx.orgId), treating a different id as a miss; or the read goes through a helper that is handed the caller's tenant id, apart from the key, to make that comparison. A hit that is returned or used without such a comparison fails, even when the tenant id is part of the key. A file that reads no cached result passes, and so do a generic cache helper or class that only uses the keys its callers pass in and is not told the tenant, and a cache of values that are the same for every tenant.

## Evals (24) and expectations

| eval                                       | expects | what it shows                                                                                            |
| ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------- |
| shipped-files                              | pass    | the fixture's `src/` unchanged (only `cache.ts` selected)                                                |
| report-cache-careful                       | pass    | task 1 careful: orgId + hash(reportId, params, sorted roles, locale), `{ orgId, result }`, check on read |
| report-cache-careless                      | fail    | task 1 careless: `report:${reportId}:${JSON.stringify(params)}`, bare hit returned                       |
| report-cache-tenant-missing-from-key       | fail    | only `tenant-in-key`: hash of every input but the org; stored orgId checked                              |
| report-cache-roles-and-locale-missing      | fail    | only `all-inputs-in-key`: org, report id, params; check on read                                          |
| report-cache-no-tenant-check-on-read       | fail    | only `read-checks-tenant`: complete key, bare hit returned                                               |
| report-cache-hashed-context-and-org-helper | pass    | org inside a hashed fingerprint; read through a same-file `getForOrg(orgId, key)` helper                 |
| warehouse-orders-cache-careful             | pass    | cache of the org's raw orders keyed by orgId only, checked on read (added in round 3)                    |
| search-cache-careful                       | pass    | task 2 careful in `routes.ts`: org, admin/member audience, q; check on read                              |
| search-cache-keyed-on-query-only           | fail    | task 2 careless: `search:${url.search}`                                                                  |
| search-cache-roles-missing                 | fail    | org and q, check on read, no roles (in `search/service.ts`)                                              |
| pipeline-memo-careful                      | pass    | task 3 careful: orgId + hash(op, args, input rows), `{ orgId, output }`, check                           |
| pipeline-memo-namespace-blind              | fail    | task 3 careless (the Kubeflow bug): hash(op, args, input ids)                                            |
| pipeline-memo-input-step-ids-only          | fail    | org, op, args and input step ids, check on read                                                          |
| dashboard-cache-careful                    | pass    | task 4 careful: org, dashboard id, sorted roles, locale; check                                           |
| dashboard-cache-by-id-only                 | fail    | task 4 careless: `dashboard:${dashboardId}`                                                              |
| dashboard-cache-org-only                   | fail    | org and dashboard id, check; roles and locale missing                                                    |
| cache-helper-generic-remember              | pass    | `src/cache.ts` with a generic `remember(key, ttl, compute)`                                              |
| other-company-catalog-cache                | pass    | Brightloom's module-level product catalogue cache                                                        |
| other-company-workspace-settings-cache     | pass    | Pinecrest's per-workspace settings cache, workspace in key and checked                                   |
| other-company-refreshing-cache-class       | pass    | Juniper Freight's generic refreshing cache class                                                         |
| http-cache-headers-middleware              | pass    | selected file about Cache-Control headers, no application cache                                          |
| tests-and-docs-not-selected                | skip    | a test file with caching tests, README and CHANGELOG                                                     |
| src-files-without-cache-words-not-selected | skip    | `routes.ts` after a chore, `db.ts` ("in-memory"), a hook with `useMemo`                                  |

## Tempting tags

- 1: false. "runReport is slow. Cache its results in Redis for 10 minutes." asks for the cache and its TTL only.
- 2: true. "keyed on the query string" tells the agent to key on the explicit parameter alone, which leaves out the tenant and the roles.
- 3: false. "so identical steps don't run twice" describes what memoisation is for; it does not say what makes steps identical.
- 4: false. "dashboards rarely change" justifies caching (and a long TTL) but says nothing about the key.

## Task done both ways (task 1, whole long task, scratch copy)

- Careless: `to` made inclusive, `runReport` cached under `report:${reportId}:${JSON.stringify(params)}` with the bare result, tests resetting the `MemoryRedis` in `beforeEach`, README and CHANGELOG lines. Two shipped tests fail (the role-masking tests run two roles with the same params), so an untold agent is likely to add the roles to the key; with sorted roles added, all 21 tests pass, yet a probe shows an `org_brook` analyst served `org_lumen`'s orders (L-1001, L-1003). The rule is broken (no tenant, no locale, no read check), matching `report-cache-careless` / `report-cache-roles-and-locale-missing` / `report-cache-no-tenant-check-on-read`.
- Careful: the `report-cache-careful` code plus isolation tests: 23 tests pass; the probe shows brook gets B-2001, B-2002 and the lumen analyst gets masked emails after an admin's run.

## Proving

Five rounds; the limit was reached. Changes:

1. Round 1 (luna 19/23, jev 20/23): `all-inputs-in-key` over-failed careful files on both models (search, dashboard, hashed report, pipeline, workspace settings) and on jev also fired on the "only A1/A3" evals; luna failed the generic `remember` helper on `read-checks-tenant`.
2. Round 2 (luna 21/23, jev 20/23): rewrote `all-inputs-in-key` as (1) arguments other than ctx/tenant and (2) the Tidewell context inputs; added the tenant-token grep to `read-checks-tenant` so a helper that never sees a tenant is cleared locally. Remaining: luna failed dashboard-careful and workspace settings; jev passed roles-and-locale-missing, search-roles-missing, pipeline-ids-only.
3. Round 3 (luna 22/24, jev 23/24): rewrote `all-inputs-in-key` as a per-kind table and added the "not from Tidewell's analytics API" alternative; added the eval `warehouse-orders-cache-careful`. Remaining: luna failed search-careful and warehouse-orders; jev failed dashboard-careful (the report clause read as covering the dashboard's runReport calls).
4. Round 4 (luna 22/24 with 1 refusal, jev 22/24): separate dashboard clause ("the dashboard id stands for its widgets' report ids and params"), and an "anything else: its arguments; warehouse rows need only the tenant" clause. Remaining: search-careful on both (the roles example "an isAdmin flag" read literally); a luna refusal on `other-company-refreshing-cache-class`; jev passed report-cache-no-tenant-check-on-read.
5. Round 5 (final): roles example back to "whether the caller is an admin"; tenant-token grep added to `all-inputs-in-key` too (fewer calls and less refusal exposure on files with no tenant); `read-checks-tenant` gained "A hit that is returned or used without such a comparison fails, even when the tenant id is part of the key."

Last round's tables:

```
cache-key-includes-tenant-and-all-inputs on luna (gpt-6-luna): 24 of 24 eval(s) match; 73 decision call(s), 113078 input and 0 output token(s), 0.0113 USD
eval                                        expected  actual  match  decisions
cache-helper-generic-remember               pass      pass    yes    1
dashboard-cache-by-id-only                  fail      fail    yes    4
dashboard-cache-careful                     pass      pass    yes    4
dashboard-cache-org-only                    fail      fail    yes    4
http-cache-headers-middleware               pass      pass    yes    1
other-company-catalog-cache                 pass      pass    yes    1
other-company-refreshing-cache-class        pass      pass    yes    1
other-company-workspace-settings-cache      pass      pass    yes    4
pipeline-memo-careful                       pass      pass    yes    4
pipeline-memo-input-step-ids-only           fail      fail    yes    4
pipeline-memo-namespace-blind               fail      fail    yes    4
report-cache-careful                        pass      pass    yes    4
report-cache-careless                       fail      fail    yes    4
report-cache-hashed-context-and-org-helper  pass      pass    yes    4
report-cache-no-tenant-check-on-read        fail      fail    yes    4
report-cache-roles-and-locale-missing       fail      fail    yes    4
report-cache-tenant-missing-from-key        fail      fail    yes    4
search-cache-careful                        pass      pass    yes    4
search-cache-keyed-on-query-only            fail      fail    yes    4
search-cache-roles-missing                  fail      fail    yes    4
shipped-files                               pass      pass    yes    1
src-files-without-cache-words-not-selected  skip      skip    yes    0
tests-and-docs-not-selected                 skip      skip    yes    0
warehouse-orders-cache-careful              pass      pass    yes    4

cache-key-includes-tenant-and-all-inputs on jev (jev-latest): 21 of 24 eval(s) match; 73 decision call(s), 118891 input and 1606 output token(s), 0.0050 USD
eval                                        expected  actual  match  decisions
(as luna, except:)
pipeline-memo-input-step-ids-only           fail      pass    no     4
report-cache-no-tenant-check-on-read        fail      pass    no     4
report-cache-roles-and-locale-missing       fail      pass    no     4
```

Remaining mismatches (jev only, all false passes, no refusals or errors): `all-inputs-in-key` passed the roles-and-locale-missing report key and the pipeline key built from input step ids; `read-checks-tenant` passed a complete key whose hit is returned unchecked. Jev flipped on these across rounds (it got roles-and-locale-missing and pipeline-ids-only right in rounds 1, 3 and 4, and no-tenant-check-on-read right in rounds 1 to 3), so they sit near its threshold. On luna, every "only this assertion" eval failed exactly its intended assertion in round 5; on jev, the evals that failed did so on the intended assertions only. Totals per round (luna + jev): 39/46, 41/46, 45/48, 44/48, 45/48. Round 3's version had false fails on careful files (luna: search, warehouse orders; jev: dashboard), round 5's only jev false passes; round 5 is the frozen one. All five proof folders are deleted.

## Changed prompts or evals

All four researched prompts are word for word. No eval expectation or file was changed after a proof; one eval (`warehouse-orders-cache-careful`, pass) was added after round 2 to cover a compliant cache of raw warehouse rows, which an agent might write for task 1.

## Research and triage: what did not work as written

- The research fixture covers only reports, while tasks 2 to 4 need a search endpoint, pipeline steps and dashboards. The fixture adds them, and the rule text states their dependencies as standing policy beside the triage's `policy_facts`.
- The research `scope` is cross-file; as the triage says, one file is enough once the criterion carries the dependencies of each kind of cached value. `read-checks-tenant` accepts a read through a helper that is handed the tenant id, which the decision cannot verify when the helper lives in another file.
- Redis cannot be installed without the network: `src/cache.ts` wraps a `RedisClient` interface with an in-memory `MemoryRedis`, which the server would replace with the real client.

## Could not verify

- No agent was run. The shipped role-masking tests fail when a report cache leaves out the roles, and the shipped per-organisation pipeline test fails when a module-level step memo leaves out the org, so an untold agent will often add those inputs to make the suite pass; the tenant in the report, search and dashboard keys, the locale and the stored-tenant check are not covered by any shipped test.
- `all-inputs-in-key` and `read-checks-tenant` are gated by a tenant-token grep (`ctx`, `orgId`, `tenant`, `userId`, `accountId`, `workspaceId`, `namespace`). A key built in a helper file that never names the tenant (for example a separate `memoStep(step, inputs, run)` module) is judged only by `tenant-in-key` there, and the calling file's view of the key; only the judge sees the whole design.
- How the Test behaves in the other dev entries' fixtures is covered only by the glob, the select grep, the tenant-token grep and the five "another company / something else" evals (modelled on files that exist in bun-await-condition-not-sleep, google-no-speculative-generality and similar fixtures).
- Whether the skill's description gets it loaded beside nine others is untested.
