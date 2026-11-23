# The version check is the write, and cleanup keeps active plans

The Python modules under `enactor/` apply the planner's plans to Fernhill's DNS endpoints, push
their addresses to the DNS provider and clean up old plans, on a SQLite database. In every one of
them:

When a worker applies a versioned plan or configuration, the "is this newer than what is applied?" check must happen atomically with the write (a conditional write on the version), and cleanup must never delete a version that is currently active.

- Here the worker is the enactor, which applies plans from the `plans` table to the rows of `endpoints`. Several enactors may run at once, as separate processes that share only the SQLite database, so a lock held inside one process does not stop the others.
- The version an endpoint has applied is its `endpoints.plan_gen`. The conditional write is one `UPDATE endpoints ... WHERE name = ? AND plan_gen < ?` (or `AND plan_gen = ?` with the value read before it) whose `rowcount` the code checks, and the endpoint's addresses are pushed with `dns.push` only after that write changed the row. The one other atomic form is the read, the check, the push and the write all inside one `with store.transaction(immediate=True):` block.
- Anything else is not atomic: reading `plan_gen`, comparing it in Python and then writing or pushing in a separate step, even inside a plain `with store.transaction():`; pushing before the conditional write; and writing `plan_gen` with no version check at all.
- A plan is active while any endpoint's `plan_gen` names it. A cleanup that deletes plans leaves out the active ones within the `DELETE` statement itself, through a subquery on `endpoints` such as `AND gen NOT IN (SELECT plan_gen FROM endpoints)`, or reads them and deletes inside one `with store.transaction(immediate=True):` block.

Code that only reads plans or endpoints, writes other columns or tables, or retries a push inside
`dns.push` itself is not judged. Neither are the tests under `tests/`.
