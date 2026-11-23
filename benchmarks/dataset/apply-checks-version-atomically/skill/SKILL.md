---
name: apply-checks-version-atomically
description: Use whenever you write or change Python code under enactor/ that applies a plan to the endpoints, records an endpoint's plan_gen, pushes records with dns.push, retries a failed push, runs several enactors at once, or deletes old plans from the plans table (cleanup, pruning, retention), even if the request does not mention concurrency. Covers making the "is this plan newer than what the endpoint has?" check part of the write itself, with a conditional UPDATE on plan_gen, and keeping every plan an endpoint still uses out of any cleanup.
---

# The version check is the write, and cleanup keeps active plans

## The rule

When a worker applies a versioned plan or configuration, the "is this newer than what is applied?" check must happen atomically with the write (a conditional write on the version), and cleanup must never delete a version that is currently active.

- Here the worker is the enactor, which applies plans from the `plans` table to the rows of `endpoints`. Several enactors may run at once, as separate processes that share only the SQLite database, so a lock held inside one process does not stop the others.
- The version an endpoint has applied is its `endpoints.plan_gen`. The conditional write is one `UPDATE endpoints ... WHERE name = ? AND plan_gen < ?` (or `AND plan_gen = ?` with the value read before it) whose `rowcount` the code checks, and the endpoint's addresses are pushed with `dns.push` only after that write changed the row. The one other atomic form is the read, the check, the push and the write all inside one `with store.transaction(immediate=True):` block.
- Anything else is not atomic: reading `plan_gen`, comparing it in Python and then writing or pushing in a separate step, even inside a plain `with store.transaction():`; pushing before the conditional write; and writing `plan_gen` with no version check at all.
- A plan is active while any endpoint's `plan_gen` names it. A cleanup that deletes plans leaves out the active ones within the `DELETE` statement itself, through a subquery on `endpoints` such as `AND gen NOT IN (SELECT plan_gen FROM endpoints)`, or reads them and deletes inside one `with store.transaction(immediate=True):` block.

## Why

A push to the DNS provider is slow and retried, so an enactor can spend seconds between reading
an endpoint's version and writing it. Another enactor can apply a newer plan in that gap, and the
slow one then writes its older plan over it. A cleanup that deletes by age alone can then remove
the very plan that endpoint now serves. Amazon's DynamoDB outage of October 2025 was exactly this:
a delayed DNS enactor applied an old plan over a newer one because its freshness check was
stale, and another enactor's cleanup deleted that old plan, leaving the endpoint with an empty
DNS record. Tests run one enactor at a time, so they pass.

## How to apply it

1. Claim the endpoint with the conditional `UPDATE` and read its `rowcount`: 0 means the endpoint
   already has this plan or a newer one, so skip it.
2. Push only after a successful claim. Retrying that push later is fine; claiming again is not
   needed.
3. In cleanup, put the exclusion of active plans inside the `DELETE` statement.

Common slips:

- `store.get_endpoint(...)`, `if plan.gen > ep.plan_gen:`, push, then `UPDATE ... WHERE name = ?`.
- Collecting "endpoints that need this plan" up front, then pushing and recording them later,
  for example after retries.
- Pushing first and recording afterwards, so a stale enactor's push lands before its write fails.
- Running the conditional `UPDATE` but pushing whatever its `rowcount` was.
- A `threading.Lock` or `multiprocessing.Lock` around a read-then-write: other processes ignore it.
- `DELETE FROM plans WHERE gen < ?`, or one that spares only the plan just applied.

## Example

A rollout worker moves hosts to a new agent build; `hosts.build` is the build each host runs.

Violating: the build is read and compared, the slow install runs, then the build is written.

```python
host = db.execute("SELECT build FROM hosts WHERE id = ?", (host_id,)).fetchone()
if build.number > host["build"]:
    installer.install(host_id, build)          # slow, retried
    db.execute("UPDATE hosts SET build = ? WHERE id = ?", (build.number, host_id))
db.execute("DELETE FROM builds WHERE number < ?", (build.number - 5,))
```

Compliant: the comparison is in the `UPDATE`, its `rowcount` decides, and cleanup spares builds in use.

```python
cur = db.execute(
    "UPDATE hosts SET build = ? WHERE id = ? AND build < ?",
    (build.number, host_id, build.number),
)
if cur.rowcount == 1:
    installer.install(host_id, build)
db.execute(
    "DELETE FROM builds WHERE number < ? AND number NOT IN (SELECT build FROM hosts)",
    (build.number - 5,),
)
```

## Before you commit

For every place in the staged diff that writes `plan_gen`, pushes with `dns.push` or deletes from
`plans`, confirm: the write's `WHERE` compares `plan_gen` and its `rowcount` is acted on (or the
whole read-check-push-write is in one `immediate=True` block), the push comes after a successful
write, and the `DELETE` leaves out every plan an endpoint names. Fix what fails and check again.
