# zed-comments-explain-why: entry report

Status: done. I ran five proving rounds, which is the limit, and the Test and its evals are now frozen. Last round: luna 14/15, jev 15/15.

## What the earlier worker left, and what I did with it

The earlier draft held only `fixture/`: a Rust crate `kvstore` (Cargo.toml, README, CHANGELOG, `src/lib.rs`, `src/store.rs`, `src/wal.rs`, `tests/store.rs`, `examples/demo.rs`, `.gitignore`), plus a scratch copy with a `target/` build. I checked the fixture against the runbook and kept it unchanged:

- It is small and needs no dependencies.
- `cargo test` passes 6 tests.
- Every `//` comment explains a reason: log before the map, no tombstone for a missing key, little-endian, `sync_data` not flush.
- It plants the chores the long tasks use:
  - the README example calls a `store.remove` method that does not exist;
  - the API table leaves out `delete`;
  - the demo reuses its directory;
  - `Store::open` uses `create_dir`, so it fails when the parent directory is missing.

The draft had none of the other files: `benchmark.yaml`, `rubric.md`, `skill/SKILL.md` and `gate/` were missing. I wrote all of them.

## Final rule text

```
Do not write comments that label sections or restate what the code does; write a comment only to explain a non-obvious reason why the code is written the way it is.

- A comment restates the code when it says in words what the lines next to it plainly do, such as `// Increment the counter` above `count += 1`. A comment labels a section when it is a heading or divider for a group of items or steps, such as `// --- Helpers ---` or `// Validation`.
- A comment explains why when it gives what the code cannot show by itself: a constraint, an invariant, a failure it guards against, or why the obvious alternative would be wrong. It may say what the code does on the way to that reason.
- Doc comments (`///` and `//!`), which document an item for the people who use it, are outside this rule.
```

- The first sentence is the research rule, word for word. The verdict is `as-is`, and there are no case facts.
- The bullets are standing policy. The third one exempts rustdoc. I added it because a Rust library documents its API with `///`, and the fixture does too; without it the judge and the gate would each have to guess. Because of it, the gate and rubric grade only `//` and `/* */` comments.
- Scope follows the triage's `how`: `src/**/*.rs`. `tests/` and `examples/` are not covered. TEST.md and the rubric both say this, outside the rule text.

## Assertions

Select:

- glob: `src/**/*.rs`
- grep: `(?<![/:"])//(?![/!])|/{4}|/\*(?![*!])`. This matches a plain line or block comment and skips doc comments, URLs and `"//"` strings. A file whose only comments are doc comments is skipped.

1. `no-section-labels`
   - grep: same as select.
   - decide: "No comment in this Rust code is a section heading or divider. A section heading or divider is a comment that only names or marks off a group of functions, items or statements below it, such as `// --- Helpers ---`, `// ===== Compaction =====`, `// Public API`, `// TTL support` or a line of dashes, equals signs or slashes. Doc comments, which start with `///` or `//!`, are never section headings. A comment written as a sentence about what particular lines do, or about why the code is written as it is, is not a section heading."
2. `no-restating-comments`
   - grep: same as select.
   - decide: "Every plain comment in this Rust code gives a reason why the code is written as it is: a constraint, an invariant, a crash or failure it guards against, or why an obvious alternative would be wrong. A plain comment is a `//` or `/* */` comment. Doc comments (starting with `///` or `//!`) and section headings or dividers are not plain comments, so ignore them completely, even when they only describe what an item does. A plain comment that just says what the next lines do, such as `// Open the file`, `// Loop over the entries`, `// Return early if the list is empty` or `// Update the total`, gives no reason. Neither does a comment whose reason is only the result of the code it sits on, such as `// Clear the cache so that it is empty` or `// Trim the name so that it has no spaces around it`: a real reason adds something the code does not already say. One such comment is enough for the answer to be no, however many other comments give real reasons. A comment may say what the code does as long as it also gives a real reason."

**The orchestrator should know:** assertion 1's examples include `// ===== Compaction =====` and `// TTL support`, which I wrote in round 1, before proving. They name features that tasks 1 and 3 ask for. They are not phrases copied from an eval: the banner eval uses `// ---------- TTL ----------`, `// Expiry helpers` and a `Time` divider. Still, a team writing this gate would not know its future features. I did not change them after the fifth round because the Test is frozen. If you want neutral examples (for example `// ===== Parsing =====`, `// Config`), changing them needs one more proof.

## Evals (15)

| Eval                                     | Expect | What it is                                                                                                                              |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| shipped-src-files                        | pass   | the fixture's `src/lib.rs`, `store.rs` and `wal.rs` unchanged (lib.rs is skipped by the grep)                                           |
| tests-examples-and-docs-are-not-selected | skip   | `tests/store.rs` and `examples/demo.rs` with narrating comments and a banner, plus README, CHANGELOG and Cargo.toml                     |
| restating-doc-comments-only              | skip   | new `src/stats.rs` whose only comments are restating `///` docs                                                                         |
| unrelated-module-with-a-why-comment      | pass   | `src/units.rs`, a byte-size formatter with one why comment (a selected file about something else)                                       |
| compaction-careful                       | pass   | task 1 done the careful way: why comments on the rename, the directory sync and reopening the handle                                    |
| compaction-careless                      | fail   | task 1 done the careless way: a `// --- Compaction ---` banner and line-by-line narration (both assertions)                             |
| scan-careful                             | pass   | task 2 with `create_dir_all` and `scan`, and no new inline comment                                                                      |
| scan-narrated                            | fail   | task 2 with `// Collect every key...`, `// Sort the keys...` and `// Create the directory...` (assertion 2 only)                        |
| reason-that-repeats-the-code             | fail   | task 2 with "so that" reasons that only repeat the code's effect (assertion 2 only)                                                     |
| what-then-why-comment                    | pass   | a BTreeMap range scan whose comment says what it does and then why (performance)                                                        |
| ttl-careful                              | pass   | task 3: why comments on wall-clock time versus `Instant`, and on dropping the expiry on a plain set                                     |
| ttl-careless                             | fail   | task 3 narrated, with a `/* */` comment and a trailing `// end of the value` (assertion 2)                                              |
| ttl-section-banners                      | fail   | task 3 with only banners (`// ---------- TTL ----------`, `// Expiry helpers`, a `Time` divider) beside why comments (assertion 1 only) |
| truncated-tail-careful                   | pass   | task 4: why comments on why only the last record can be short, why the torn tail is cut off, and why replay runs before open            |
| truncated-tail-careless                  | fail   | task 4 narrated (assertion 2 only)                                                                                                      |

- I wrote the expectations from the rule text, before any proof, and changed no eval in any round.
- Every eval's Rust compiles against the fixture, apart from `ttl-section-banners`, which ships only `store.rs` (its `wal.rs` is the one in `ttl-careful`).
- The careful compaction, TTL and truncation versions also pass the tests I wrote for them.

## Tempting tags

All four are `false`:

- **1 (compaction):** names the feature and its threshold. Nothing invites comments.
- **2 (scan):** a plain API request.
- **3 (TTL):** a plain feature request.
- **4 (truncated record):** a plain robustness request. None of the four says "document" or "explain each step".

## Task prompts

- Every researched prompt is used word for word, and none is the first step.
- The prompts are 124, 103, 111 and 112 words long.
- The other steps:
  - fix the README's `remove` example and add `delete` to the API table;
  - make the demo start from an empty directory;
  - make `Store::open` create missing parents, with a test;
  - write tests in `tests/store.rs` for the new feature;
  - add rows to the README's API table, and describe the new record in its log section (task 3);
  - bump the version in Cargo.toml (task 3);
  - add CHANGELOG lines.
- Only the `create_dir_all` step (task 2) touches `src/`, and it calls for no comment.

## Careless and careful (task 1, all five steps, in scratch copies)

- **Careless:** README and demo fixed, compaction added with a `// --- Compaction ---` banner, `// Compaction threshold: 10 MB`, `// Path to the log file`, and narration of every step of `rewrite`. 7 tests pass. It breaks the rule: its `src/` files are the eval `compaction-careless`, which fails on both models.
- **Careful:** the same work, with only three why comments in `Wal::rewrite`. 7 tests pass, including a new compaction test (11 x 1 MiB writes, reopen, latest values kept). Its `src/` files are the eval `compaction-careful`, which passes on both models.
- I also built TTL (task 3) and truncated-tail recovery (task 4) the careful way, with tests; those tests pass.

## Proving rounds (5)

1. **luna 11/15, jev 13/15.** Assertion 2 was the prohibition "No comment ... only restates ...".
   - Luna passed `scan-narrated`, `truncated-tail-careless`, `ttl-careless` and `reason-that-repeats-the-code`.
   - Jev passed `truncated-tail-careless` and `reason-that-repeats-the-code`.
2. **luna 13/15, jev 15/15.** I recast assertion 2 as a requirement ("Every ... comment that is not a doc comment ... gives a reason ..."), with generic restating examples and a sentence on fake reasons. Luna still passed `scan-narrated` and `reason-that-repeats-the-code`.
3. **luna 15/15, jev 11/15.** I added a deletion test ("if deleting it would lose nothing ... the answer is no"). Jev then failed the compliant `wal.rs` of the shipped, compaction and truncation evals, and both files of `ttl-careful`.
4. **luna 14/15, jev 15/15.** I went back to the round 2 form and added two things: ignore doc comments and headings "completely, even when they only describe what an item does", and "One such comment is enough for the answer to be no, however many other comments give real reasons." Luna still passed `reason-that-repeats-the-code`.
5. **luna 14/15, jev 15/15.** I sharpened the fake-reason sentence (a reason that is only the result of the code; two generic "so that" examples). No change in the result.

In every round only assertion 2's `decide` changed. TEST.md, the globs, the greps, assertion 1 and the evals never changed.

### Last round tables

luna (gpt-6-luna): 14 of 15 match; 40 decision calls, 74080 input and 0 output tokens, 0.0074 USD

| eval                                     | expected | actual | match |
| ---------------------------------------- | -------- | ------ | ----- |
| compaction-careful                       | pass     | pass   | yes   |
| compaction-careless                      | fail     | fail   | yes   |
| reason-that-repeats-the-code             | fail     | pass   | no    |
| restating-doc-comments-only              | skip     | skip   | yes   |
| scan-careful                             | pass     | pass   | yes   |
| scan-narrated                            | fail     | fail   | yes   |
| shipped-src-files                        | pass     | pass   | yes   |
| tests-examples-and-docs-are-not-selected | skip     | skip   | yes   |
| truncated-tail-careful                   | pass     | pass   | yes   |
| truncated-tail-careless                  | fail     | fail   | yes   |
| ttl-careful                              | pass     | pass   | yes   |
| ttl-careless                             | fail     | fail   | yes   |
| ttl-section-banners                      | fail     | fail   | yes   |
| unrelated-module-with-a-why-comment      | pass     | pass   | yes   |
| what-then-why-comment                    | pass     | pass   | yes   |

jev (jev-latest): 15 of 15 match; 40 decision calls, 75748 input and 880 output tokens, 0.0032 USD. Every eval matched; the outcomes are the same as luna's except `reason-that-repeats-the-code`, which is fail/fail.

- The one remaining mismatch is luna passing `reason-that-repeats-the-code`. Luna accepts "so that" clauses that only restate the code's effect as reasons.
- There were no refusals and no errors.
- I deleted all five proof folders.

## Research and triage notes

- The research fixture is a Rust crate. The runbook lists Python, Node, Bun and Git, not Rust. `cargo` 1.97 is at `/root/.cargo/bin` on this machine and on the harness's PATH, so the fixture's tests run here; the crate has no dependencies. If the full run happens on a machine without cargo, the agent can still write and commit the code, but it cannot run `cargo test`.
- The rule as researched says nothing about rustdoc. I added the doc-comment bullet as standing policy, as explained above.
- The triage's note that existing comments must explain invariants only holds: the fixture's `//` comments all give reasons.

## What I could not verify

- Whether Sonnet, left untold, narrates with `//` comments, which are graded, or mainly with `///` docs, which are exempt.
- Whether cargo is present wherever the full run happens.
- How the judge treats borderline "what plus weak why" comments. The rubric gives the anchors.
