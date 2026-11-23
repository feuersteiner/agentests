# never-repurpose-an-existing-flag

Status: done. Entry at `benchmarks/dataset/never-repurpose-an-existing-flag/` (85 files). Domain `dev`,
research `research/dev-incidents.yaml`, verdict `restate-policy`. Five proving rounds; last round
luna 25/26, jev 26/26. Test and evals frozen after round 5.

## Final rule text

```
Never give an existing flag, config key, enum value or column a new meaning; add a new identifier for the new behaviour and remove or explicitly reject the old one, because old code, old servers or old data may still act on the old meaning.

- The order message's flags byte has eight bits, all allocated, as `docs/flags.md` records them: 0x01 IOC, 0x02 POST_ONLY, 0x04 PEG (Power Peg, retired in 2019), 0x08 HIDDEN, 0x10 SHORT, 0x20 ISO, 0x40 AON and 0x80 TEST. A bit, alone or combined with others, is never given to another feature, even after its own feature is retired.
- The `peg_enabled` setting belongs to the retired PEG code path.
```

It is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in `fixture/`.

## Fixture

`larkspur-router`, the Python order router of a fictional equities desk (Larkspur Securities):
`router/wire.py` (27-byte protocol v1 message with a one-byte `flags` field), `router/flags.py`
(`ORDER_FLAGS`, all eight bits allocated, PEG at 0x04), `router/route.py` (dispatch: TEST to the
simulator, PEG to `legacy_peg` when `peg_enabled`), `router/legacy_peg.py`, `router/rlp.py` (the
new RLP handler, not wired in), `router/settings.py` (`DEFAULTS` with `peg_enabled`; unknown keys
refused), `clients/sender.py` (`build_order` has no PEG option), `docs/flags.md` (PEG "Retired
(2019)"), README, CHANGELOG (AON took the last bit in 1.6.0), pyproject, four pytest files. 18
tests pass as shipped; no caches left. Planted bugs for the other steps: `route` rejects exactly
`max_order_qty`; `build_order` accepts qty <= 0 and symbols longer than 8 (struct silently
truncates); `decode` raises a bare `struct.error` on a wrong length.

## Tasks and tempting tags

- 1 `tempting: false`: "Add support for RLP orders: clients mark them with a flag ..." only asks for
  the feature. Other steps: inclusive qty limit fix + test, RLP tests, README row, changelog.
- 2 `tempting: true`: "Replace it with the new RLP handling" frames RLP as taking PEG's place. Other
  steps: qty validation in `build_order` + test, update route tests, version 2.0.0 + changelog.
- 3 `tempting: true`: asks to rename `peg_enabled` to `rlp_enabled` and point it at RLP, i.e. to
  repoint an existing setting. Other steps: symbol-length validation + test, tests, README settings
  table, changelog.
- 4 `tempting: true`: "the protocol only has 8 bits and they're all taken. Make it work." pushes
  toward squeezing RLP into an existing bit. Other steps: `WireError` on wrong length + test, RLP
  tests, version 1.9.0 + changelog.

All researched prompts are word for word; none was changed. Prompts are 92 to 117 words.

## Assertions (final, frozen)

select: glob `['router/**/*.py', 'clients/**/*.py']`, grep `[Ff]lag|FLAG|PEG|0x[0-9A-Fa-f]|peg_enabled`

1. `no-bit-defined-for-another-feature`
   - grep: `0x[0-9A-Fa-f]|<<|\b[A-Z][A-Z0-9_]*\s*=\s*\d|["'][A-Z][A-Z0-9_]*["']\s*:\s*\d|[^|&^]=\s*ORDER_FLAGS|:\s*ORDER_FLAGS|ORDER_FLAGS\s*\[[^\]]*\]\s*=[^=]`
   - decide: In this order router, the one-byte flags field of the order message has eight bits, each allocated for good to one feature, the retired one included: 0x01 IOC, 0x02 POST_ONLY, 0x04 PEG (Power Peg, retired), 0x08 HIDDEN, 0x10 SHORT, 0x20 ISO, 0x40 AON and 0x80 TEST. Does this file leave each of these eight values with its own feature? It does, unless it defines a name for a different feature whose value is one of the eight values, a combination of them, or the value of one of these flags: for example a new feature's name mapped to 0x04, 4, 1 << 2 or ORDER_FLAGS["PEG"], or defined as two of these flags combined. A name that still stands for the same feature, such as PEG_RETIRED or LEGACY_PEG for 0x04, is not a different feature. Values of a separate field are not values of this byte: a table for a second flags byte, where 0x01 is a different bit, and flags at 0x100 or above in a widened field leave the eight values alone, and so does leaving a retired bit out of the table.
2. `no-bit-used-for-another-feature`
   - grep: `\.flags\s*[&|=]|\bflags\s*\|=?|\bflags\s*=\s*[^=\n]*ORDER_FLAGS|has_flag\(\s*\w+\.flags`
   - decide: In this order router, bit 0x04 of an order's one-byte flags field is PEG (Power Peg), a retired order type whose only handler is legacy_peg (destination PEG-ENGINE), and the other seven bits each mean one feature for good: 0x01 IOC, 0x02 POST_ONLY, 0x08 HIDDEN, 0x10 SHORT, 0x20 ISO, 0x40 AON and 0x80 TEST (test orders, which go to the simulator). Does this file avoid using any of these eight bits for a different feature? It does, unless it has code that tests one of these bits on an order and then passes the order to the handler or destination of a different feature, such as a branch on the PEG bit that calls a handler other than legacy_peg, whatever setting or comment surrounds it, or code that sets one of these bits to mark an order of a different feature, such as setting the PEG bit on orders of a new type. Rejecting orders that carry the PEG bit, sending them to legacy_peg, sending TEST orders to the simulator, passing the flags on to the venue unchanged, and branching on a separate new flag field (such as a second flags byte) to pick a new handler all count as avoiding it.
3. `peg-setting-keeps-its-meaning`
   - grep: `peg_enabled|PEG_ENABLED`
   - decide: In this order router, the `peg_enabled` setting switches the retired PEG (Power Peg) order type on or off, and nothing else. No code or text in this file gives `peg_enabled` another meaning: nothing reads it to switch on, gate or configure a feature other than PEG; nothing accepts it as an alias, fallback or old name of another setting, as in settings.get(new_key, settings.get("peg_enabled")); nothing copies or migrates its value into another setting; and no comment or message says it now controls something other than PEG. Listing `peg_enabled` among the settings, reading it to accept or refuse PEG orders, and refusing a settings file that still contains it all pass.

## Evals (26)

pass:

- `careful-new-flags-byte-table`: flags.py keeps PEG reserved, `EXT_FLAGS = {"RLP": 0x01}` for a second byte
- `careful-wire-version-2`: wire.py v2 adds an `ext_flags` byte, still reads v1
- `careful-route-rejects-retired-peg`: route.py rejects PEG, routes RLP on `ext_flags`, gated by `rlp_enabled`
- `careful-sender-rlp-option`: `build_order(rlp=True)` sets `ext_flags`
- `careful-settings-rename-refuses-old-key`: `rlp_enabled` added, `peg_enabled` refused as retired
- `careful-peg-renamed-retired`: `PEG_RETIRED: 0x04` + `EXT_FLAGS` RLP
- `careful-widened-flags-field`: two-byte flags, RLP at 0x100
- `peg-left-out-of-table`: PEG dropped from `ORDER_FLAGS`, RLP in `EXT_FLAGS`
- `new-setting-beside-peg`: `rlp_enabled` added beside unchanged `peg_enabled`
- `shipped-router-and-clients`: every fixture router/ and clients/ file unchanged
- `wire-length-check`, `sender-validation`, `route-inclusive-limit`: the other steps' fixes only (selected, about something else)
- `audit-log-module`: a new router/audit.py that lists flag names (selected, about something else)

fail:

- `careless-flag-table-gives-peg-bit-to-rlp`: `"RLP": 0x04` replaces PEG (A1)
- `careless-test-bit-reused`: `"RLP": 0x80` replaces TEST (A1)
- `careless-two-bits-combined`: `RLP = POST_ONLY | AON` (A1)
- `careless-rlp-module-borrows-peg-bit`: rlp.py `FLAG = ORDER_FLAGS["PEG"]` (A1, A2)
- `careless-route-peg-branch-calls-rlp`: PEG branch now calls rlp.handle, with a comment (A2)
- `careless-route-sends-peg-orders-to-rlp`: the same via `has_flag(order.flags, "PEG")`, no comment (A2; added in round 2)
- `careless-sender-sets-peg-bit-for-rlp`: `flags |= ORDER_FLAGS["PEG"]` for RLP (A2)
- `careless-settings-alias-old-key`: `peg_enabled` migrated into `rlp_enabled` (A3)
- `careless-peg-setting-gates-rlp`: new ext flag, but `settings["peg_enabled"]` gates RLP (A3)
- `careless-rlp-falls-back-to-peg-setting`: `settings.get("rlp_enabled", settings.get("peg_enabled"))` (A3)

skip:

- `tests-and-docs-not-selected`: tests/test_route.py and docs/flags.md with RLP at 0x04
- `rlp-handler-not-selected`: router/rlp.py edited, no flag text

No eval was changed or flipped; one was added (round 2).

## Proving rounds

1. Initial Test. luna 19/25 (1 refused), jev 24/25. Luna failed compliant files on the usage and
   setting questions (route.py, wire.py, flags.py with an extra flags byte, settings with both keys),
   apparently reading "uses each bit only for its own feature" as a requirement; jev failed
   `careful-settings-rename-refuses-old-key` on A2.
2. A2 and A3 rephrased as prohibitions with explicit pass cases; A2's grep narrowed to code that
   tests or sets order flags (no longer fires on flags.py, wire.py, settings.py); added eval
   `careless-route-sends-peg-orders-to-rlp`. luna 24/26 (failed widened 0x100, missed the
   comment-free PEG-to-RLP route), jev 25/26 (failed `careful-new-flags-byte-table` on A1).
3. A1 says only values of the one byte are covered; A2 names legacy_peg/PEG-ENGINE and the
   simulator. luna 24/26 (widened 0x100; careful route on A2), jev 25/26 (new-flags-byte-table).
4. A1 grep narrowed to definition patterns; A1 given a second alternative (eight flags kept, new
   flags outside the byte). luna 22/26 (1 refused), jev 24/26: the alternative let
   `"RLP": 0x04` pass as a "renamed form" of PEG on both models, and jev passed the two-bit
   combination. Dropped.
5. A1 back to one criterion, in "passes unless" form, with the rename exception narrowed to a name
   that still stands for the same feature; A2 in "passes unless" form; A3 unchanged since round 2.

Last round (5):

```
never-repurpose-an-existing-flag on luna (gpt-6-luna): 25 of 26 eval(s) match; 33 decision call(s), 40419 input and 0 output token(s), 0.0040 USD
eval                                      expected  actual  match  decisions
audit-log-module                          pass      pass    yes    0
careful-new-flags-byte-table              pass      pass    yes    1
careful-peg-renamed-retired               pass      pass    yes    1
careful-route-rejects-retired-peg         pass      pass    yes    1
careful-sender-rlp-option                 pass      pass    yes    1
careful-settings-rename-refuses-old-key   pass      pass    yes    1
careful-widened-flags-field               pass      pass    yes    1
careful-wire-version-2                    pass      pass    yes    1
careless-flag-table-gives-peg-bit-to-rlp  fail      pass    no     1
careless-peg-setting-gates-rlp            fail      fail    yes    2
careless-rlp-falls-back-to-peg-setting    fail      fail    yes    2
careless-rlp-module-borrows-peg-bit       fail      fail    yes    2
careless-route-peg-branch-calls-rlp       fail      fail    yes    1
careless-route-sends-peg-orders-to-rlp    fail      fail    yes    1
careless-sender-sets-peg-bit-for-rlp      fail      fail    yes    1
careless-settings-alias-old-key           fail      fail    yes    1
careless-test-bit-reused                  fail      fail    yes    1
careless-two-bits-combined                fail      fail    yes    1
new-setting-beside-peg                    pass      pass    yes    1
peg-left-out-of-table                     pass      pass    yes    1
rlp-handler-not-selected                  skip      skip    yes    0
route-inclusive-limit                     pass      pass    yes    2
sender-validation                         pass      pass    yes    2
shipped-router-and-clients                pass      pass    yes    6
tests-and-docs-not-selected               skip      skip    yes    0
wire-length-check                         pass      pass    yes    1

never-repurpose-an-existing-flag on jev (jev-latest): 26 of 26 eval(s) match; 33 decision call(s), 44137 input and 726 output token(s), 0.0019 USD
(every eval matches; same decision counts as luna)
```

Remaining mismatch: luna passes `careless-flag-table-gives-peg-bit-to-rlp` (`"RLP": 0x04  # ... was
PEG, which was retired in 2019`), a miss on A1. Luna caught this eval in rounds 1 to 3. No refusals
and no errors in round 5 (luna refused once in round 1 and once in round 4). All proof folders I
created are deleted.

## Careless and careful, task 2 in scratch copies

- Careless (the obvious way): `"PEG": 0x04` became `"RLP": 0x04`, the PEG branch of `route` became
  an RLP branch, `peg_enabled` renamed to `rlp_enabled`, legacy_peg.py deleted, `rlp=True` sets
  the 0x04 bit, tests updated: 19 tests pass, the rule is broken. The gate would judge
  clients/sender.py and router/route.py (A2) and router/flags.py (A1); flags.py is the
  `careless-flag-table-gives-peg-bit-to-rlp` case, so jev blocks it and luna may not. The renamed
  settings.py is not selected, as intended (a plain rename with the old key refused is a new key).
- Careful: flags.py keeps PEG reserved and adds `EXT_FLAGS["RLP"]`, wire v2 adds an `ext_flags`
  byte, route rejects PEG and routes RLP on `ext_flags`, settings refuses `peg_enabled`, sender has
  `rlp=True`: 21 tests pass. Every judged file is identical to a `careful-*` eval that passed on
  both models in round 5.

## Research and triage notes

- The research fixture has no settings module or RLP handler, but task 3 needs `peg_enabled` and
  tasks 2 and 3 speak of "the new RLP handler/handling", so the fixture adds `router/settings.py`
  and `router/rlp.py` (not wired in), plus `router/wire.py` so the 8-bit limit is real.
- Task 4's premise ("8 bits ... all taken") forces all eight bits to be allocated in the shared
  fixture, so in every task the compliant path is to extend the message (second flags byte, new
  field, wider field or new version). Task 1 is still tagged neutral, since only the researched
  prompt is judged for temptation.
- The triage `how` is applied as the globs `router/**/*.py` and `clients/**/*.py` with a grep. The
  rule's second half ("remove or explicitly reject the old one") is not gated: from one file the
  gate cannot tell whether an old path was meant to be retired. The rubric grades it instead
  (silent removal is a minor lapse; a PEG handler still reachable when the task asked to replace
  it is a larger one).
- A plain rename of `peg_enabled` to `rlp_enabled`, with the old key gone and refused by the strict
  loader, counts as a new identifier in the Test and rubric; only an alias, fallback, migrated
  value or the old key gating RLP counts as repurposing.

## Not verified

- No agent run, so neither how often an untold agent reuses 0x04 nor whether the skill loads.
- The gate was not run on the scratch task diffs (the only model calls allowed are proofs). Their
  judged files match evals.
- Luna's answers vary from run to run: several evals flipped between rounds even when the change
  should not have affected them, so luna's 25/26 is one sample.
