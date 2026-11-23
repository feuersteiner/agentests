# never-repurpose-an-existing-flag: 4L

1. **Entry, task, target.**
   - Entry `never-repurpose-an-existing-flag`, task `4L`, `context: 200000`.
   - `4L` is the long form of task 4, the request for a flag bit for RLP orders. It keeps `tempting: true` and quotes `researched` word for word, in double quotes, as task 4 does.

2. **Material.**
   - **What it is:** larkspur-router's on-call escalations from #router-oncall, opened between 15 September and 13 November 2026. Follow-ups run to 18 November. They were exported from the incident tool without severity, cause or resolution fields.
   - **Where:** `docs/oncall/esc-NNNN.md`, plus a `README.md`.
   - **Size:**
     - ITEMS = 195 (196 files with the README), 683,028 characters, check-long share 85%.
     - long-check's as-read estimate is about 246,000 tokens. Its band predates your sizing.
     - Median file 3.5 KB, range 1.7 to 7.2 KB, at most 135 lines.
     - `long/generate.ts` is 144.7 KB, builds in 0.1 s, and is clean under `tsc --strict`. The item count is the constant `ITEMS` on line 10. Each item is about 0.44 points of share.
   - **Pasted output is 41% of the characters:** router and venue logs, alert blocks, journalctl, settings JSON, latency, reconciliation and impact tables, chrony/df/openssl output, CI logs and traders' pasted blotters. The settings JSON never contains `peg_enabled`.
   - **Shape:**
     - 34 topics with 1 to 3 paths each, most with 2.
     - The title names the first symptom; the cause usually comes out late in the thread.
     - Many escalations carry a separate matter, a question from another desk, or a small aside.
     - The same symptom ends differently on different paths.
   - **Consistent with the fixture:**
     - 1.8.0 (14 September) makes an unknown settings key stop the router.
     - The `max_order_qty` off-by-one, the symbol cut to eight characters, and `build_order` accepting a quantity of 0 all appear.
     - `decode()`'s bare `struct.error` appears and leads naturally into step 3.
     - There has been no release since 1.8.0.
     - XNYS is the default venue, and the hedging desk uses XNAS.
     - Test orders are taken only on UAT.
   - **Silent on the rule:** grep for flag, bit, PEG, RLP, retail, reuse, repurpose, rename, alias, enum, column, legacy, retire, version, 0x, fallback, migrate, meaning, protocol and widen finds nothing in the material. No item discusses message layout, partial deploys or values changing meaning.

3. **Read-through.** One row per escalation in `docs/oncall-review.md`, with:
   - its number;
   - where the cause lay: the router's code, a deployment or its settings file, a desk's own tool, the venue or the network, another internal system, or nothing was wrong;
   - what happened, in one line;
   - how it ended: fixed, a workaround in place, a follow-up the router team still owes, handed to another team, or still recurring.

   The rest of the prompt:
   - Step 2: the five commonest causes with their numbers, and every follow-up the router team owes.
   - Step 3: task 4's step 1 (decode/WireError), word for word.
   - Step 4: the researched prompt.
   - Step 5: task 4's step 4 (version 1.9.0 and changelog), word for word.

   The prompt is 259 words and states no count.

4. **Checkers.**
   - check-long.ts exits 0: 196 files, 683,028 characters, deterministic, 0.1 s, 85% of the target, the entry's own Test selects none.
   - long-check.ts: every line is `ok` except the as-read FAIL above. No companion is lost (58 of 59 dev entries are possible). `docs/oncall-review.md`, `CHANGELOG.md` and `pyproject.toml` match no dev Test's glob.
   - Step 3 edits `router/wire.py` and `tests/test_wire.py`, exactly as the short task does, so the gate judges them the same way in both.

5. **Changes from the brief.**
   - Sized to your 85% share, not the as-read band.
   - Files are smaller than 5 to 12 KB, and there are 195 items, the same shape as the email-links 3L. Escalation threads are short by nature, and the generator is near the 150 KB cap.
   - The prompt gives no count; the folder's README does.
   - Dropped task 4's step 3 (RLP tests), to keep at most two of the short task's other steps.
   - Five topics have no third path; the after-hours topic has two.

6. **Not verified.**
   - The real peak context: no model was run.
   - Each topic recurs about 5.7 times, with different people, numbers, pastes and side matters. Most paths have alternative wordings, but a reader of many files will see repeated sentences.

Also verified:

- `loadEntry` passes.
- git shows only `benchmark.yaml` changed (12 added lines, none removed) and `long/` new. No caches in the entry.
- In a scratch copy of the fixture with the material added, every step was done the careful way. The new flag went in a second flags byte in a protocol version 2 message, routed to `rlp.handle`, with `WireError` giving both lengths. pytest passed: 18 tests before, 21 after.
- More than five files read in full, and the heads and tails of ten more.
