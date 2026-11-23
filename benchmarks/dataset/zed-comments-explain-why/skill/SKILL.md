---
name: zed-comments-explain-why
description: Use whenever you write or change Rust code under src/ in this crate, such as adding a feature, a method or a fix to the store or its log, even if the request says nothing about comments. Covers which comments to write and which to leave out, including section headings and dividers, comments that narrate what the code does, comments that explain why, and doc comments.
---

# Comments explain why, never what

## The rule

Do not write comments that label sections or restate what the code does; write a comment only to explain a non-obvious reason why the code is written the way it is.

- A comment restates the code when it says in words what the lines next to it plainly do, such as `// Increment the counter` above `count += 1`. A comment labels a section when it is a heading or divider for a group of items or steps, such as `// --- Helpers ---` or `// Validation`.
- A comment explains why when it gives what the code cannot show by itself: a constraint, an invariant, a failure it guards against, or why the obvious alternative would be wrong. It may say what the code does on the way to that reason.
- Doc comments (`///` and `//!`), which document an item for the people who use it, are outside this rule.

## Why

The code already says what it does, and a comment that repeats it is one more thing to read and
one more thing to go stale when the code changes. Headings split a file that should be split by
functions and modules instead. What the code cannot say is why it is the way it is: the crash it
survives, the order it must keep, the alternative that looks simpler and is wrong. That is what a
reader needs, and a comment is the only place it can live.

## How to apply it

For each `//` or `/* */` comment you are about to write in `src/`:

1. Cover it and read the code. If the code already says it, delete the comment; if it is hard to
   read without it, rename a variable or extract a function instead.
2. If it is a heading or a divider, delete it.
3. If it gives a reason a careful reader would not guess, keep it, and lead with the reason.

Common slips: a comment above every block of a new function (`// Parse the header`,
`// Build the result`); `// Check if ...` above an `if`; `// Return ...` above the last line;
`// --- Section ---` banners between methods; a "reason" that only repeats the effect
(`// Sort so the list is sorted`). Writing no comment at all is often right.

## Example

Reading a config file that another process may be rewriting.

Violating: every comment repeats the line under it, and the reason that matters is missing.

```rust
// ---------- Loading ----------

// Read the file into a string
let mut text = fs::read_to_string(&path)?;
// Retry once if the file is empty
if text.is_empty() {
    thread::sleep(Duration::from_millis(50));
    text = fs::read_to_string(&path)?;
}
```

Compliant: one comment, and it says what the code cannot.

```rust
let mut text = fs::read_to_string(&path)?;
// The editor saves by truncating and then writing, so a read can land between the two and
// see an empty file; one short retry is enough to get past it.
if text.is_empty() {
    thread::sleep(Duration::from_millis(50));
    text = fs::read_to_string(&path)?;
}
```

## Before you commit

Read the staged diff of `src/` once more and look at every `//` and `/* */` line you added. Delete
each heading and each comment that says what the next lines say, and check again before you
commit.
