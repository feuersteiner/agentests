# A cache key includes the tenant and every input

Tidewell's analytics API serves many organisations from one process and one Redis. In every
TypeScript source file under `src/` that caches or memoises a computed result, in Redis or in a
map or object kept between calls:

An application cache key must include the tenant (user, organisation, namespace) and every other input that changes the result, and a cache read must confirm the entry belongs to the caller's tenant.

- In Tidewell's analytics API the tenant is the organisation: `ctx.orgId` on the `RequestContext` a request is handled with, or the `orgId` a pipeline runs for.
- Results depend on the caller's context as well as on the arguments. `runReport` filters rows by `ctx.orgId`, masks columns by `ctx.roles` and formats money and dates by `ctx.locale`, as `src/reports/queries.ts` applies them, and a dashboard is rendered from `runReport` results. `search` returns only the organisation's documents and leaves out restricted ones unless `ctx.roles` includes `admin`. A pipeline step's output depends on its organisation's data, its `op` and `args`, and the outputs of the steps it reads, which those steps' ids do not identify.
- An entry confirms its tenant when it is stored with the organisation id it was computed for and the read compares that id with the caller's before using the entry, treating a different id as a miss.

The tests under `test/`, and any `*.test.ts` or `*.spec.ts` file, are not judged. A file that
stores and reuses no computed result has nothing to judge, and neither has a generic cache helper
that only uses the keys its callers pass in, or a cache of values that are the same for every
tenant, such as a product catalogue or exchange rates.
