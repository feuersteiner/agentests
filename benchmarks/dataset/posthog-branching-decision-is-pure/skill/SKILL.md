---
name: posthog-branching-decision-is-pure
description: Use whenever you write or change Python code under billing/ or another service module that chooses one outcome among several from business conditions, such as an eligibility or entitlement check, routing or assignment, deduplication, a retry or escalation policy, or a status or lifecycle transition, in code that also queries the database, calls an API client or reads the clock, even if the request says nothing about design or testing. Covers how to write the choice as a function of plain values with the current time passed in, and what the calling code around it does.
---

# A branching decision is a pure function

## The rule

Code that picks one outcome among several (eligibility, routing, dedupe, state transitions) is a pure function that takes plain values, including the current time, and returns the decision; the caller performs the database reads, client calls and clock reads and then carries the decision out.

## Why

A decision tangled with queries and `datetime.now()` can only be tested with a database and a
frozen clock, hides its inputs, and tends to grow a write in every branch. As a function of values
it can be read in one screen, tested with a table of cases, replayed on yesterday's data, and
reused by a script or a preview without touching anything.

## How to apply it

1. Spot the decision: any code with branches on business values (plan, counts, status, age, days
   overdue, keywords) that ends in one of several outcomes.
2. Write it as a function whose parameters are the values it compares: strings, numbers, booleans,
   datetimes, enums, or a small record already loaded. If time matters, take `now` as a required
   parameter.
3. Return the outcome: a bool, an enum member or a name. Raise for an outcome that is not allowed.
   No writes, no sends.
4. In the calling function, do the reads (repository, client, clock), call the decision, then act
   on what it returned. Branching there on the returned outcome is fine: that is carrying it out.

Common slips:

- `decide(conn, customer_id)`: an id plus a connection means the lookups happen inside.
- `now: datetime | None = None` followed by `now = now or datetime.now()` in the decision.
- One "small" count or flag lookup left inside the conditions.
- Returning from the middle of the branches after having already updated a row.
- Checking a transition table inline in the function that loads and saves the record.

## Example

Choosing how to ship an order.

Violating: the choice reads the database and the clock, and acts.

```python
def choose_shipping(conn, order_id):
    order = orders.get(conn, order_id)
    if order.express and datetime.now().hour < 15:
        orders.set_carrier(conn, order_id, "courier")
    elif stock.count(conn, order.sku) == 0:
        orders.set_carrier(conn, order_id, "backorder")
    else:
        orders.set_carrier(conn, order_id, "post")
```

Compliant: a pure decision, and a caller that reads, decides and applies.

```python
def choose_carrier(express: bool, in_stock: int, now: datetime) -> str:
    if express and now.hour < 15:
        return "courier"
    if in_stock == 0:
        return "backorder"
    return "post"


def assign_carrier(conn, order_id):
    order = orders.get(conn, order_id)
    carrier = choose_carrier(order.express, stock.count(conn, order.sku), datetime.now())
    orders.set_carrier(conn, order_id, carrier)
```

## Before you commit

Read every function in the staged diff that branches on business values. For each, confirm that
its parameters are plain values, that its body has no query, client call or clock read, and that
it only returns. Move anything else to the caller and check again.
