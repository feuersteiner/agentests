# A branching decision is a pure function

The Python modules under `billing/` hold the billing back office: plans, queries and the operations
the admin console calls.

Code that picks one outcome among several (eligibility, routing, dedupe, state transitions) is a pure function that takes plain values, including the current time, and returns the decision; the caller performs the database reads, client calls and clock reads and then carries the decision out.

A function that only loads values, hands them to the function that decides, and then acts on the
decision it got back is the caller, not the decision. Queries, constants and operations that make
no such choice are not covered.
