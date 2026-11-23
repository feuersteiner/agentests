---
name: uv-no-history-in-comments
description: Use whenever you write or edit Python code in the csvtool package (csvtool/*.py), such as fixing a bug, changing how input is read or parsed, refactoring or optimising a function, even if the request says nothing about comments. Covers what a new or edited comment or docstring may say about the change you are making, and where the history of a change belongs instead.
---

# Comments describe the code, not its history

## The rule

Comments describe the code as it is now and why; they never narrate the change history, the conversation or prompt that led to the change, or what the code used to do.

- Docstrings count as comments.
- A comment narrates the change when it describes the edit rather than the code: what was fixed, changed, added, replaced or made faster ("Fixed crash on ...", "Changed X to Y", "Now handles the empty case"), when that happened ("since 0.4"), who asked for it or where it was discussed ("as requested", "per the review", "as discussed"), or what the code did before ("used to", "previously", "no longer", "the old version").
- Explaining why the code is written the way it is, including the outside fact that requires it, such as a quirk of the files it reads, is what comments are for. Words such as "now" or "earlier" are fine when they describe what the program does as it runs.

## Why

A comment is read by someone who opens the file months later and never saw the request, the
review or the code that was there before. "Fixed the crash" or "switched from X to Y" tells them
nothing about the code in front of them, and it goes stale with the next change. The commit
message and the changelog already record what changed and who asked for it; a comment's job is to
say what the code does and which outside fact makes it look this way.

## How to apply it

Write each comment as if the code had always been this way.

- Name the constraint, not the fix: what in the input files, the platform or the callers forces
  this code.
- When you change what a function does, rewrite its docstring as a plain statement of the new
  behaviour, not as "now does X" or "X instead of Y".
- Put what changed, and why it was asked for, in the commit message and in `CHANGELOG.md`.

Phrases that usually mean a comment narrates the edit: "Fix:", "Fixed", "Changed", "Switched to",
"Replaced", "Updated", "Now ...", "no longer", "used to", "previously", "the old ...",
"as requested", "per review", "since v0.x". The same words are fine when they describe what the
program does while it runs, such as "the header read earlier" or "rows seen so far".

## Example

Violating: the comment and docstring tell the story of the edit.

```python
def load_settings(path):
    """Load settings. Now handles Windows line endings."""
    # Fixed: files saved on Windows broke parsing. Switched to splitlines() as requested.
    lines = Path(path).read_text().splitlines()
```

Compliant: they say what the code does and why.

```python
def load_settings(path):
    """Load settings from a file with Unix or Windows line endings."""
    # Files saved on Windows end their lines with CRLF; splitlines() splits on both endings.
    lines = Path(path).read_text().splitlines()
```

## Before you commit

Read every comment and docstring that your staged diff adds or changes under `csvtool/`. For each
one, ask whether it still makes sense to a reader who never saw the old code or the request.
Rewrite any that describe the edit, move that information to the commit message or the changelog,
and check again.
