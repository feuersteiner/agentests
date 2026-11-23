---
name: cache-key-includes-tenant-and-all-inputs
description: Use whenever you add or change caching or memoisation in the TypeScript code under src/ - Redis reads and writes through src/cache.ts, a Map or object kept between calls, a memoised function or a caching wrapper around anything computed for a request or an organisation (reports, search results, dashboards, pipeline steps) - even if the request does not mention tenants. Covers what a cache key must contain and what a cache read must check in a service that many organisations share.
---

# A cache key includes the tenant and every input

## The rule

An application cache key must include the tenant (user, organisation, namespace) and every other input that changes the result, and a cache read must confirm the entry belongs to the caller's tenant.

- In Tidewell's analytics API the tenant is the organisation: `ctx.orgId` on the `RequestContext` a request is handled with, or the `orgId` a pipeline runs for.
- Results depend on the caller's context as well as on the arguments. `runReport` filters rows by `ctx.orgId`, masks columns by `ctx.roles` and formats money and dates by `ctx.locale`, as `src/reports/queries.ts` applies them, and a dashboard is rendered from `runReport` results. `search` returns only the organisation's documents and leaves out restricted ones unless `ctx.roles` includes `admin`. A pipeline step's output depends on its organisation's data, its `op` and `args`, and the outputs of the steps it reads, which those steps' ids do not identify.
- An entry confirms its tenant when it is stored with the organisation id it was computed for and the read compares that id with the caller's before using the entry, treating a different id as a miss.

## Why

One Redis and one process serve every organisation. A key built from the explicit arguments alone
looks complete, but the function also reads the caller's context: two organisations asking the
same question collide, and the second is served the first one's data. Kubeflow Pipelines shipped
exactly this: its step cache hashed the step template without the namespace, so one tenant could
read, or plant, another tenant's step outputs. Leaving out roles or locale is the same bug within
an organisation: an analyst is served the copy computed for an admin, margins and emails included.
The stored tenant check is a second, independent guard for when a key is built wrongly elsewhere.

## How to apply it

1. Before you write the key, list everything the cached function reads: its arguments, and every
   field of `ctx` it or the functions it calls use. Put all of them in the key.
2. Start the key with the tenant, then a version, then a hash of the rest:
   `` `report:v1:${ctx.orgId}:${hash(...)}` ``. Sort lists such as roles so equal sets match.
3. Store the entry as `{ orgId, value }`, not the bare value.
4. On a read, use the entry only when `entry.orgId` equals the caller's organisation; otherwise
   treat it as a miss and compute afresh.

Slips to watch for: a key that is only the request's own parameters (`search:${q}`, an id, a hash
of a template); reading `ctx.roles` or `ctx.locale` downstream but not putting them in the key;
keying a computation on the names of its inputs rather than their values; returning a hit because
"the tenant is already in the key".

## Example

A per-organisation usage summary that hides costs from callers without the `billing` role and
formats by locale.

Violating: only the month is in the key, and the hit is returned as it is.

```ts
export async function usageSummary(ctx: RequestContext, month: string) {
	const key = `usage:${month}`;
	const hit = await getJson<Summary>(key);
	if (hit) return hit;
	const summary = await buildSummary(ctx, month);
	await setJson(key, summary, 600);
	return summary;
}
```

Compliant: the tenant, the month, the roles that matter and the locale are in the key, and the read
checks the stored organisation.

```ts
export async function usageSummary(ctx: RequestContext, month: string) {
	const seesCosts = ctx.roles.includes('billing');
	const key = `usage:v1:${ctx.orgId}:${month}:${seesCosts ? 'costs' : 'no-costs'}:${ctx.locale}`;
	const hit = await getJson<{ orgId: string; summary: Summary }>(key);
	if (hit && hit.orgId === ctx.orgId) return hit.summary;
	const summary = await buildSummary(ctx, month);
	await setJson(key, { orgId: ctx.orgId, summary }, 600);
	return summary;
}
```

## Before you commit

For every cache or memo in your diff: name each input the cached result depends on and find it in
the key; find the tenant in the key; find the stored `orgId` and the comparison on read. Fix what
is missing and check again.
