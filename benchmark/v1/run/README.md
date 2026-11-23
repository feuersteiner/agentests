# Execution and artifact access

The harness records invocation configuration, coverage, observations, judge
identity and errors alongside each run. A future run requires separate
authorization; maintenance calls no models. Agent-loop execution requires
Linux/root for private mount namespaces, authenticated Claude Code, built
`core/dist` and decision credentials retained in the harness process.

Detailed historical settings, invocation IDs, handoffs and continuation notes are
in the [private evidence repository](../../evidence/EVIDENCE.md). Exclude contaminated
batches and calibration from comparisons, distinguish quota failures from scored
outcomes and deduplicate retries. Preserve originals before continuing a run.

Public [fixture hydration](../ARCHIVE.md) restores dataset entries only.
Construction reports and unfinished patches are private history, independently
archived; they are excluded from the public fixture asset.
