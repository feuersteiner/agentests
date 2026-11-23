# Comments describe the code, not its history

The Python files of the csvtool package, under `csvtool/`, are read by maintainers who never saw
the request behind a change, so their comments follow this rule:

Comments describe the code as it is now and why; they never narrate the change history, the conversation or prompt that led to the change, or what the code used to do.

- Docstrings count as comments.
- A comment narrates the change when it describes the edit rather than the code: what was fixed, changed, added, replaced or made faster ("Fixed crash on ...", "Changed X to Y", "Now handles the empty case"), when that happened ("since 0.4"), who asked for it or where it was discussed ("as requested", "per the review", "as discussed"), or what the code did before ("used to", "previously", "no longer", "the old version").
- Explaining why the code is written the way it is, including the outside fact that requires it, such as a quirk of the files it reads, is what comments are for. Words such as "now" or "earlier" are fine when they describe what the program does as it runs.

Tests under `tests/`, the README and the changelog are not covered; the changelog is where the
history of a change belongs. A file with no comment or docstring cannot break the rule.
