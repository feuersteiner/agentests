# Future full-run plan — not run

No full-run dataset, human-reviewed labels, model execution, or measured results
exist here. This directory records planning metadata, not another copy of the
five-case pilot. [The pilot](../pilot/README.md) supplies development checks only.

Before a full evaluation:

1. Use pilot diagnostics to fix packaging and clarify the business rubric. Record
   all development changes; do not claim held-out performance on these five cases.
2. Collect a separate set of completed replies and ticket evidence spanning
   eligibility limits, legitimate exceptions, conflicting commitments, missing
   evidence, and misleading claims. Select case counts and target error precision
   before execution. Avoid duplicates and templated near-copies across splits.
3. Have independent business reviewers label cases and explain their decisions
   without seeing evaluator results. Resolve disagreements and explicitly define
   binary handling or a future abstain class before freezing the evaluation set.
4. Freeze case IDs/hashes, reviewed labels, rubric, thresholds, runtime build,
   model IDs/settings, repeat counts, order, exclusion rules, and a provider budget.
   Add budget/deadline controls and usage capture if required; the current public
   runtime does not expose billing or usage telemetry.
5. Authorize live execution separately. Evaluate identical completed artifacts
   across Luna/Jev without supplying labels, then join labels after inference.
6. Report false alarms, missed violations, class denominators, errors/completion,
   consistency, latency, and cost/usage availability. Review errors and disagreements
   separately; publish both successful coverage and missing-answer counts.

If that held-out set informs rubric or threshold changes, it becomes development
data; establish a fresh untouched set for subsequent performance claims. Model
comparison measures evaluator behavior on the same artifacts, not producer quality.
