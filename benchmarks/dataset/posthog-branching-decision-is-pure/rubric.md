# Rubric: a branching decision is a pure function

## The rule

Code that picks one outcome among several (eligibility, routing, dedupe, state transitions) is a pure function that takes plain values, including the current time, and returns the decision; the caller performs the database reads, client calls and clock reads and then carries the decision out.

## What to look at

One step of the task asks for code that picks one outcome among several: whether a customer is
eligible, what to do after a failed payment, which queue a ticket goes to, or which subscription
status follows which. Find, in the diff, the code that makes that choice: the comparisons of plans,
counts, statuses, ages, days overdue or keywords that lead to the outcome. Then ask:

1. **Is the choice a function of plain values?** Its parameters are strings, numbers, booleans,
   dates and times, enums, or simple records of them (a dataclass already loaded counts). A
   connection, a cursor, a repository module, a client or an id that it then looks up does not.
2. **Does it read nothing itself?** Inside the code that chooses there is no query or repository
   call, no HTTP, mail or other client call, and no clock read such as `datetime.now()`,
   `date.today()` or `time.time()`. When the outcome depends on time, the current time is a
   parameter. A default or fallback that reads the clock (`now = now or datetime.now()`) inside
   the deciding function is a lapse.
3. **Does it only return the decision?** It returns a boolean, a name, an enum member or a small
   result, or raises for an outcome that is not allowed. It does not update a row, send anything or
   schedule anything.
4. **Does a caller do the rest?** Some other function loads the values, reads the clock, calls the
   deciding function and then writes or sends what was decided. Branching on the returned decision
   to carry it out is the caller's job and is fine. A diff that adds only the pure function, with
   no caller yet, still follows the rule.

Where the code sits, its style and naming, and the thresholds chosen where the task leaves them
open do not matter. A table of allowed transitions is a pure decision when a function of plain
values consults it; a function that loads the subscription and checks the table inline has mixed
the two. The task's other steps (a script fix, a test, README, changelog, config) count only toward
whether the task is done: never below 7 for a skipped step alone, never above 6 when the rule is
broken, however well the other steps are done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the code that chooses also reads the database or the clock, or performs the action.
- **4 to 6**: the decision is partly separated: some inputs are passed in and others are fetched or
  read inside it, or one of several decisions is pure and another is not.
- **7 to 9**: the decision is a function of plain values that returns the outcome, with a minor
  lapse or a task that is only partly done.
- **10**: every step is done, and every choice the diff adds is a pure function of plain values
  with the current time passed in, called by code that does the reads and the writes.

What each looks like:

- **2**: one function takes a connection and an id, loads the record, calls `datetime.now()`, and
  walks through the conditions with further queries and row updates inside the branches.
- **5**: a separate function holds the conditions and returns the outcome, but it still takes the
  connection to count or look up one input, or reads the clock itself in its body.
- **8**: the deciding function takes only plain values and returns the outcome, and a caller loads
  and applies; but the current time is an optional parameter that falls back to reading the clock
  inside the deciding function, or one of the task's other steps is missing.
- **10**: for example `allowed(plan, signed_up_at, now, had_extension, project_count) -> bool` with
  no reads, and a service function that loads the values, reads the clock once, calls it and
  carries the result out; every other step done.
