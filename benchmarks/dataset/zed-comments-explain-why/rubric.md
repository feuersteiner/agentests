# Rubric: comments explain why, never what

## The rule

Do not write comments that label sections or restate what the code does; write a comment only to explain a non-obvious reason why the code is written the way it is.

- A comment restates the code when it says in words what the lines next to it plainly do, such as `// Increment the counter` above `count += 1`. A comment labels a section when it is a heading or divider for a group of items or steps, such as `// --- Helpers ---` or `// Validation`.
- A comment explains why when it gives what the code cannot show by itself: a constraint, an invariant, a failure it guards against, or why the obvious alternative would be wrong. It may say what the code does on the way to that reason.
- Doc comments (`///` and `//!`), which document an item for the people who use it, are outside this rule.

## What to look at

The repository is a small Rust key-value store with a write-ahead log. Grade the `//` and
`/* */` comments that the diff adds or changes in Rust files under `src/`. The comments there
before the diff complied: each gave a reason, such as why the log is written before the map or
why the write is synced rather than flushed. Comments in `tests/`, `examples/`, the README and the
changelog are not graded against the rule, and neither are doc comments anywhere. For each graded
comment, ask:

1. **Does it only narrate?** Cover the comment and read the code: if the code says the same
   thing, the comment restates it (`// Open the temp file`, `// Loop over the entries`,
   `// Check if the key has expired`, `// Return the keys`). Rewording a function or variable name
   is restating.
2. **Is it a heading?** Dividers and section titles between functions or groups of statements
   (`// --- Compaction ---`, `// TTL helpers`, `// Step 1: ...`) label sections.
3. **Does it give a reason?** A crash or power-loss case, an ordering constraint, an invariant, a
   format or platform limit, or why the obvious alternative is wrong, is a reason. A comment that
   names what the code does and then why (`// Rename over the log only after the sync, so a crash
   leaves either the old log or the new one`) complies. A "reason" that only repeats the code's
   effect (`// Sort so the keys are sorted`) is restating.

Writing few or no comments complies. Then check that each numbered step of the task is done. The
other steps count only toward whether the task is done, never toward the rule. Ignore code style,
naming and whether the Rust compiles cleanly, unless the task is clearly not done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: most new blocks in `src/` carry narrating comments or headings, with at most an
  incidental reason.
- **4 to 6**: a mix: some comments give real reasons, and several narrate or label sections.
- **7 to 9**: no headings and at most one or two narrating comments, with the rest explaining
  reasons or absent; or all comments comply and a step of the task is missing.
- **10**: every step is done, and every new or changed comment in `src/` explains a reason the
  code cannot show, or there is none.

What each looks like:

- **2**: the new function is narrated line by line (`// Create the temp file`,
  `// Write each entry`, `// Rename it over the log`, `// Reopen the log`), with a
  `// --- Compaction ---` divider above it.
- **5**: a comment on why the directory is synced after the rename, beside three comments that
  narrate the steps around it and a `// Helpers` heading.
- **8**: the new code has one good comment on why a truncated tail is cut off before appending,
  and one redundant `// Skip expired entries` above a filter that says the same.
- **10**: the new code has no inline comments except one or two that each give a reason, such as
  why the expiry is stored as wall-clock time rather than a monotonic instant; doc comments on new
  methods are fine.
