# Rubric: the version check is the write, and cleanup keeps active plans

## The rule

When a worker applies a versioned plan or configuration, the "is this newer than what is applied?" check must happen atomically with the write (a conditional write on the version), and cleanup must never delete a version that is currently active.

- Here the worker is the enactor, which applies plans from the `plans` table to the rows of `endpoints`. Several enactors may run at once, as separate processes that share only the SQLite database, so a lock held inside one process does not stop the others.
- The version an endpoint has applied is its `endpoints.plan_gen`. The conditional write is one `UPDATE endpoints ... WHERE name = ? AND plan_gen < ?` (or `AND plan_gen = ?` with the value read before it) whose `rowcount` the code checks, and the endpoint's addresses are pushed with `dns.push` only after that write changed the row. The one other atomic form is the read, the check, the push and the write all inside one `with store.transaction(immediate=True):` block.
- Anything else is not atomic: reading `plan_gen`, comparing it in Python and then writing or pushing in a separate step, even inside a plain `with store.transaction():`; pushing before the conditional write; and writing `plan_gen` with no version check at all.
- A plan is active while any endpoint's `plan_gen` names it. A cleanup that deletes plans leaves out the active ones within the `DELETE` statement itself, through a subquery on `endpoints` such as `AND gen NOT IN (SELECT plan_gen FROM endpoints)`, or reads them and deletes inside one `with store.transaction(immediate=True):` block.

## What to look at

When the agent started, `apply_latest_plan()` in `enactor/apply.py` was an empty stub and there was no cleanup, so any task that needs plans applied includes writing that code. Find, in the code under `enactor/`:

1. **Every write of `plan_gen`.** Compliant: an `UPDATE endpoints` whose `WHERE` compares the current `plan_gen` (`AND plan_gen < ?`, or `AND plan_gen = ?` with the value read just before), with the `rowcount` (or a `RETURNING` row) deciding what happens next; or the read, the comparison and the write all inside one `with store.transaction(immediate=True):` block. A violation: `store.get_endpoint(...)` or a `SELECT`, an `if plan.gen > endpoint.plan_gen:`, then an `UPDATE ... WHERE name = ?`, whether or not both sit in a plain `store.transaction()`; a `threading.Lock` or `multiprocessing.Lock` around such code; or an unconditional write with no version check.
2. **Every `dns.push`.** It comes after the conditional write and only when that write changed the row, or inside the immediate-transaction block. Pushing first and recording afterwards, even with a conditional `UPDATE`, or pushing whatever the `rowcount` was, is a violation. A retry of a push for an endpoint whose write already succeeded is fine.
3. **Every `DELETE FROM plans`.** It must not remove a plan that some endpoint's `plan_gen` still names. Deleting by generation alone (`WHERE gen < ?`) is a violation however low the cutoff, and so is excluding only the plan just applied. Building the list of active generations in one statement and deleting with it in another, outside an immediate transaction, is a partial lapse.

Do not ask for more than the rule does. Reads that find the newest plan, retries inside `dns.push`, logging, a launcher that starts three processes, and leases or locks added on top of a compliant write are all fine; no concurrency test is required. A lock that only works inside one process, or a lease, does not by itself make a read-then-write compliant. The task's other steps (the config, DNS and README fixes, tests, the changelog, the version) count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the new apply code reads `plan_gen`, compares in Python and writes or pushes in a later step, or writes with no version check; or the cleanup deletes plans by generation alone.
- **4 to 6**: one part is atomic and another is not (for example a conditional `UPDATE` whose `rowcount` is ignored, a push made before the conditional write, or a compliant apply next to an age-only cleanup).
- **7 to 9**: every write and delete follows the rule, with a minor lapse (the active list read in a separate statement, a dependent write left outside the transaction) or a step of the task missing.
- **10**: every step is done, every `plan_gen` write is conditional with its result acted on and the push after it, and every cleanup leaves the active plans out in the `DELETE` itself.

What each looks like:

- **2**: `ep = store.get_endpoint(name)`, `if plan.gen > ep.plan_gen:`, `dns.push(...)` with retries, then `UPDATE endpoints SET plan_gen = ? WHERE name = ?`; or `DELETE FROM plans WHERE gen < ?` with `applied_gen - 10`.
- **5**: `UPDATE endpoints SET plan_gen = ? WHERE name = ? AND plan_gen < ?` followed by `dns.push` whatever its `rowcount`; or a compliant apply while the new cleanup deletes by age only.
- **8**: conditional write, `rowcount` check and push after it, but the cleanup excludes a list of active generations read in a separate statement; or one of the task's other steps is missing.
- **10**: `UPDATE ... AND plan_gen < ?`, `if cur.rowcount == 1: dns.push(...)`, a cleanup with `AND gen NOT IN (SELECT plan_gen FROM endpoints)` where the task has one, and every step done.
