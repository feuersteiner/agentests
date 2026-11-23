# Comments explain why, never what

The Rust files under `src/` are the crate's code: the store, its write-ahead log and the crate
root. Their comments follow this rule:

Do not write comments that label sections or restate what the code does; write a comment only to explain a non-obvious reason why the code is written the way it is.

- A comment restates the code when it says in words what the lines next to it plainly do, such as `// Increment the counter` above `count += 1`. A comment labels a section when it is a heading or divider for a group of items or steps, such as `// --- Helpers ---` or `// Validation`.
- A comment explains why when it gives what the code cannot show by itself: a constraint, an invariant, a failure it guards against, or why the obvious alternative would be wrong. It may say what the code does on the way to that reason.
- Doc comments (`///` and `//!`), which document an item for the people who use it, are outside this rule.

Code under `tests/` and `examples/` is not covered.
