# Never repurpose an existing flag

The Python modules under `router/` and `clients/` build, send, read and route the desks'
orders. In every one of them:

Never give an existing flag, config key, enum value or column a new meaning; add a new identifier for the new behaviour and remove or explicitly reject the old one, because old code, old servers or old data may still act on the old meaning.

- The order message's flags byte has eight bits, all allocated, as `docs/flags.md` records them: 0x01 IOC, 0x02 POST_ONLY, 0x04 PEG (Power Peg, retired in 2019), 0x08 HIDDEN, 0x10 SHORT, 0x20 ISO, 0x40 AON and 0x80 TEST. A bit, alone or combined with others, is never given to another feature, even after its own feature is retired.
- The `peg_enabled` setting belongs to the retired PEG code path.

New behaviour gets an identifier of its own: a new setting key, or a flag outside the eight bits of
the flags byte, such as a bit of a new second flags byte or field. Renaming a flag or a setting
while it keeps its meaning, removing a retired one, and refusing orders or settings files that still
use it are not new meanings. A module that uses the flags and settings only with their listed
meanings has nothing to fix.
