---
name: never-repurpose-an-existing-flag
description: Use whenever you add, retire, replace, rename or reuse an order flag or flag bit, a setting or config key, an enum value, a message field or a column in the order router (router/ and clients/, its flags, settings and wire format), for example to add a new order type, wire in a new handler, replace a retired feature, or find room in a full flags byte, even if the request does not mention compatibility. Covers how new behaviour gets its own identifier and what happens to the old one.
---

# Never repurpose an existing flag

## The rule

Never give an existing flag, config key, enum value or column a new meaning; add a new identifier for the new behaviour and remove or explicitly reject the old one, because old code, old servers or old data may still act on the old meaning.

- The order message's flags byte has eight bits, all allocated, as `docs/flags.md` records them: 0x01 IOC, 0x02 POST_ONLY, 0x04 PEG (Power Peg, retired in 2019), 0x08 HIDDEN, 0x10 SHORT, 0x20 ISO, 0x40 AON and 0x80 TEST. A bit, alone or combined with others, is never given to another feature, even after its own feature is retired.
- The `peg_enabled` setting belongs to the retired PEG code path.

## Why

An identifier lives longer than the code that reads it. Old servers that missed a deploy, old
clients, settings files and stored data still act on what it used to mean. In 2012 Knight Capital
reused the flag that once switched on its retired Power Peg code for a new retail order feature.
One of eight servers did not get the new code, so orders carrying the flag ran the dead Power Peg
logic on that server and sent millions of unintended orders in 45 minutes, a loss of more than
460 million dollars. A new identifier means an old reader either does not know it or refuses it;
a reused one makes an old reader do the old thing, quietly.

## How to apply it

1. Give the new behaviour its own identifier: a new setting key with its own default, a new enum
   value, a new column. When the flags byte is full, add room (a second flags byte or a new field,
   with a new message version) instead of borrowing a bit.
2. Treat a retired value as reserved, not free. Keep it in the table, renamed if you like
   (`PEG_RETIRED`), so nobody hands it out again.
3. Remove the old code path, or reject the old value with a clear error: an order carrying a
   retired bit, a settings file holding a retired key.
4. A "rename" of a setting to a new feature is a new key plus the old key's removal. Do not keep
   the old name as an alias or fallback, and do not copy its value across.

Slips to watch for: "it's retired, so the bit is free"; mapping a new name onto an old value; a
branch on an old flag that now calls a new handler; `settings.get(new, settings.get(old))`;
combining two existing bits to mean something new.

## Example

A venue enum, where BATS closed and a new venue, MEMX, is being added.

Violating: the closed venue's value now means another venue, so an old client still sending 3
for BATS gets its order sent to MEMX.

```python
class Venue(IntEnum):
    XNYS = 1
    ARCX = 2
    MEMX = 3  # was BATS, closed
```

Compliant: the new venue gets a new value, and the old one is kept and refused.

```python
class Venue(IntEnum):
    XNYS = 1
    ARCX = 2
    BATS_CLOSED = 3  # reserved: never reuse
    MEMX = 4

if venue == Venue.BATS_CLOSED:
    raise Rejected("BATS closed in 2024; send MEMX (4) or another venue")
```

The same goes for a setting whose unit changes: `cache_ttl` in seconds does not start meaning
minutes; add `cache_ttl_minutes` and refuse `cache_ttl`.

## Before you commit

For every flag, bit, setting, enum value and field the diff introduces or touches, check that it
is either new or still means what it meant before the change. Check that nothing reads an old name
as a fallback for a new one, and that a retired value is removed or rejected, never reassigned. Fix
what fails and check again.
