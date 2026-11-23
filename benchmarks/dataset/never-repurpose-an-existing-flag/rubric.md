# Rubric: never repurpose an existing flag

## The rule

Never give an existing flag, config key, enum value or column a new meaning; add a new identifier for the new behaviour and remove or explicitly reject the old one, because old code, old servers or old data may still act on the old meaning.

- The order message's flags byte has eight bits, all allocated, as `docs/flags.md` records them: 0x01 IOC, 0x02 POST_ONLY, 0x04 PEG (Power Peg, retired in 2019), 0x08 HIDDEN, 0x10 SHORT, 0x20 ISO, 0x40 AON and 0x80 TEST. A bit, alone or combined with others, is never given to another feature, even after its own feature is retired.
- The `peg_enabled` setting belongs to the retired PEG code path.

## What to look at

Read every line of code the diff adds or changes under `router/` and `clients/`, and the tests
and docs for what they show the code does. Find what the new behaviour, Retail Liquidity Program
(RLP) orders, is keyed on: a flag bit or flag name, a setting key, a field of the order message.
Before the agent started, all eight bits were allocated and no setting meant anything but its own
feature, so any reuse in the diff is the agent's. For each identifier ask:

1. **Is it new?** A flag outside the eight bits (a bit of a new second flags byte or field, a bit
   at 0x100 or above of a widened field, a new message version that carries it) and a new setting
   key such as `rlp_enabled` with its own default are new identifiers. One of the eight bits, or a
   combination of them, used for RLP is a repurposed one, whatever the code calls it:
   `"RLP": 0x04`, `RLP = ORDER_FLAGS["PEG"]`, a PEG branch in `route` that now calls the RLP
   handler, a client that sets the PEG bit to mark an RLP order.
2. **Is `peg_enabled` repurposed?** Reading it to switch RLP on, accepting it as an alias, fallback
   or old name of `rlp_enabled`, or copying its value into `rlp_enabled` breaks the rule. Adding
   `rlp_enabled` and dropping `peg_enabled`, so that a settings file still holding it is refused,
   is a new identifier, even when the commit calls it a rename.
3. **What happens to the old one?** Where the diff retires PEG, the best result deletes the PEG
   path, keeps 0x04 reserved and rejects orders that still carry it with a clear error. Dropping
   PEG so that an order with 0x04 is silently treated as ordinary is a minor lapse; keeping the PEG
   handler reachable when the task asked to replace PEG is a larger one. When the task does not ask
   to retire PEG, leaving it as it was is fine.

A comment or changelog line that explains a reuse ("PEG is retired, so 0x04 now marks RLP") does
not make it compliant, and neither does a version check that reads an old bit with a new meaning.
The prompt's other steps (bug fixes, tests, README, changelog, version) count only toward whether
the task is done: a diff that follows the rule but skips one scores 7 to 9, never lower for that
alone; a diff that breaks the rule scores 1 to 6 however well it does them. A diff that gives RLP
no identifier at all has not done the step the rule is about: score it 4 to 6 when the rest is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: RLP is keyed on an existing identifier. A **2** replaces `"PEG": 0x04` with
  `"RLP": 0x04` in `ORDER_FLAGS`, or sends orders carrying the PEG bit to `rlp.handle`, or reads
  `peg_enabled` as the fallback for `rlp_enabled`, with the rest of the task done.
- **4 to 6**: half followed. A **5** gives RLP a new flag outside the eight bits but keeps
  `peg_enabled` as an alias of `rlp_enabled` (or the reverse: a new setting, but the PEG bit marks
  RLP orders); or, asked to replace PEG, adds a new RLP flag and leaves the PEG handler reachable.
- **7 to 9**: new identifiers throughout, with a minor lapse, or the rule fully followed and a step
  of the task missing. An **8** puts RLP on a new identifier and removes PEG, but an order that
  still carries 0x04 now goes to the venue as an ordinary order instead of being rejected; or does
  everything right and skips the changelog or a requested test.
- **10**: every step is done; RLP has its own flag outside the eight bits and, where asked, its own
  setting; no existing bit, flag name or setting has a new meaning; and where PEG is retired, its
  bit stays reserved and orders or settings files that still use it are rejected with a clear error.
