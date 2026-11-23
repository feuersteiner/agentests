# Rubric: a cache key includes the tenant and every input

## The rule

An application cache key must include the tenant (user, organisation, namespace) and every other input that changes the result, and a cache read must confirm the entry belongs to the caller's tenant.

- In Tidewell's analytics API the tenant is the organisation: `ctx.orgId` on the `RequestContext` a request is handled with, or the `orgId` a pipeline runs for.
- Results depend on the caller's context as well as on the arguments. `runReport` filters rows by `ctx.orgId`, masks columns by `ctx.roles` and formats money and dates by `ctx.locale`, as `src/reports/queries.ts` applies them, and a dashboard is rendered from `runReport` results. `search` returns only the organisation's documents and leaves out restricted ones unless `ctx.roles` includes `admin`. A pipeline step's output depends on its organisation's data, its `op` and `args`, and the outputs of the steps it reads, which those steps' ids do not identify.
- An entry confirms its tenant when it is stored with the organisation id it was computed for and the read compares that id with the caller's before using the entry, treating a different id as a miss.

## What to look at

Find every cache or memo the diff adds or changes in the source under `src/`: Redis through the
`getJson`/`setJson` helpers, a `Map` or object kept between calls, a caching wrapper. The
repository had no cache in use when the agent started. For each one ask:

1. **Is the tenant in the key?** `ctx.orgId` (or the pipeline's `orgId`) must be in the key string,
   or inside the object that is hashed or serialised into it. A key built only from the explicit
   arguments, such as `report:${reportId}:${JSON.stringify(params)}`, `search:${q}`,
   `dashboard:${dashboardId}` or a hash of a step's `op` and `args`, lacks it.
2. **Is every other input in the key?** Reports and dashboards also need the report id and params
   (or the dashboard id), the roles and the locale; search needs `q` and the roles (an `isAdmin`
   flag derived from them is enough); a pipeline step needs its `op`, its `args` and its inputs'
   outputs, a hash of them or the keys they were cached under, not just the input steps' ids.
   Extra inputs, such as the user id, are harmless.
3. **Does the read check the tenant?** The stored entry must carry the organisation id it was
   computed for, and the read must compare it with the caller's before using the hit, treating a
   mismatch as a miss. The tenant being in the key is not this check. A helper that is handed the
   caller's organisation id and makes the comparison counts.

The task's other steps (the date filter, the 400 and 404 answers, the step-input check, the
`reportId` field, tests, README, changelog and version) count only toward whether the task is done.
Do not grade the TTL, invalidation or the hashing method.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a cache keyed without the tenant and read without a tenant check, so one
  organisation can be served another's results.
- **4 to 6**: the tenant is in the key, but the roles, the locale or a step's inputs are missing,
  or the read never checks the entry's tenant; or one cache follows the rule and another does not.
- **7 to 9**: tenant and every input in every key and the tenant checked on every read, with a
  minor lapse, or a step of the task missing.
- **10**: the whole task is done and every cache follows the rule.

What each looks like:

- **2**: `` setJson(`search:${q}`, hits, 300) `` read back with no check; a report cache keyed on
  the report id and params; a pipeline memo keyed on a hash of `op`, `args` and input ids, shared
  by every organisation that installed the template.
- **5**: `report:${ctx.orgId}:${reportId}:${JSON.stringify(params)}`, so an analyst can be served a
  finance user's margins or a German-formatted copy; or a complete key whose hit is returned
  without comparing its stored `orgId`.
- **8**: every key holds the tenant and every input and every read compares the stored `orgId`,
  but a test, the README or the changelog line is missing, or roles are in the key unsorted so
  equal role sets can miss each other.
- **10**: for example a key such as `report:v1:${ctx.orgId}:` plus a hash of the report id,
  params, sorted roles and locale, the entry stored as `{ orgId, result }`, and a hit used only
  when `hit.orgId === ctx.orgId`; every other step of the prompt done.
