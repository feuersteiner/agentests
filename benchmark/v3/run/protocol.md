# Controlled runtime and judgment pilot

This protocol separates runtime overhead from evaluator semantics. The runtime
comparison holds producer inputs, feedback, gate criterion, threshold, revision
budget and final review constant. It does not establish calibrated gate accuracy
or a preferred support outcome.

## Fixed task and models

Reuse the unchanged v2 complex support fixtures. The small pilot selects
`complex-support-01` and `complex-support-02`, with one trial for each situation,
gate provider and treatment: 2 situations × 2 gates × 3 treatments = 12 trials.
The situation, rather than a draft, is the independent task unit. Each producer
conversation is isolated. The generic workflow is absent in every treatment.
Reviewer expectations, existing candidate alternatives and source summaries stay
outside producer and evaluator packets.

All producers and independent final reviewers use `gpt-6.1-terra`. Gates use
`gpt-6-luna` or TypeSafe `jev-latest` through the shipped binary runtime. Keep the
v2 broad gate criterion and threshold **0.8** unchanged. There are at most three
producer submissions and three gate evaluations per trial; stop on a pass or an
error. Each rejection supplies exactly the existing finding ID, criterion and
score. Quiet execution does not remove this feedback or shorten the model's
conversation. Keep the complete prior drafts and feedback in later submissions.

## Treatments

| Treatment            | Library progress logging           | Scheduling                                                                                          |
| -------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| A: existing behavior | Default logger                     | Existing 24 trial workers; no additional provider cap                                               |
| B: quiet             | Per-instance no-op progress logger | Same as A                                                                                           |
| C: quiet and bounded | Same as B                          | Same 24 trial workers; shared producer/reviewer OpenAI cap 4, and gate cap 2 for each gate provider |

The logger controls library progress only. Preserve evidence, error recording and
the final-review barrier in all three treatments. Gates and producers retain
their existing numerical outputs and JSON contracts. No treatment changes
criterion content, threshold, SDK retry policy, output limit, or model identity.
Queue wait must be recorded separately from time inside a provider request.

The small plan orders situation/provider blocks deterministically and rotates
treatments `ABC`, `BCA`, `CAB`, `ABC` across its four blocks. Freeze the exact
order before calls. Each treatment trial completes its production loop and final
review before the next cohort begins. This balances treatment positions as
closely as four blocks permit and prevents cross-treatment resource interference.
These singleton cohorts cannot exercise caps above one concurrent request. The
small pilot validates instrumentation and request preservation; separate offline
load tests validate cap enforcement. Its timing differences are exploratory. Two
situations cannot support useful cluster uncertainty or a quality noninferiority
claim.

For a separately authorized performance follow-up, use all ten unchanged
situations, one repeat, both gates and all treatments: 60 trials. Run matched
treatment cohorts in isolation so A/B traffic cannot consume C's provider slots
or quota. Counterbalance cohort order with a frozen seed and a recorded cyclic
schedule across provider blocks; rotate the first treatment in additional
authorized batches. Hold the environment and account limits constant and record
other workload. With only one batch, report residual time-of-day and service-load
confounding. Do not pool singleton-pilot timings with concurrent follow-up timings.

## Call and cost limits

For N trials, logical ceilings are 3N producer calls, 3N gate calls and N final
reviews. The small pilot therefore permits at most **36 + 36 + 12 = 84 logical
calls**. The ten-situation follow-up permits at most **180 + 180 + 60 = 420**.
There is no automatic trial replay or reviewer retry. A revision is a planned
new draft, not a retry of a failed request.

Count gate SDK HTTP attempts independently: at most three upstream attempts per
logical gate evaluation, enforced before forwarding. Producer and reviewer
adapters each issue one HTTP request. The small pilot's upstream ceiling is
therefore **36 + 3×36 + 12 = 156 requests**; the follow-up ceiling is **780**.
An interrupted or failed attempt consumes budget even if its outcome is unknown.
Quota exhaustion is a hard stop. Preserve errors, partial drafts and missing
reviews, and never silently replace them with successful trials. A new run uses
a new directory and independently authorized budget.

Freeze a price table and an explicit dollar stop before paid execution. No dollar
estimate follows from call counts alone. For each priced HTTP attempt j, with
total input I, cached input K, output O and per-million-token prices p:

`estimatedCost(j) = ((I-K)×pInput + K×pCached + O×pOutput) / 1,000,000`.

Sum across producer, gate and review attempts, adding separately disclosed
request-based charges where applicable. Prefer provider-reported actual charges
when available and keep estimates separate. Missing token counts, cache counts,
rates or charges remain unavailable; do not substitute zero or count cached
tokens twice. Stop before requests that could exceed the frozen budget using
conservative request bounds; if such bounds or prices are unavailable, execution
requires an independently enforced spending cap. A token formula without those
inputs is not a monetary ceiling.

## Evidence and review

Before inference, freeze hashes of fixtures, ordered packets, producer prompts,
feedback serializer, gate criterion and threshold, reviewer prompt/schema,
runtime/build, adapters, logger settings, caps, order seed and job order. Preserve
the full manifest and all detailed evidence privately under ignored results.
Do not put credentials in prompts, workspaces, logs or exports.

For every request record its trial and draft hash, role, attempt index, actual
response model, status, queue-entry/start/end times, request/response bytes,
available input/output/cache usage, output limit, HTTP attempts, provider latency
and cost availability. Distinguish serialized payload size from actual model
tokens and library stdout size from producer input. Record evidence-write and
logging duration separately from network and queue duration. Record batch
makespan and time until a final reviewed draft; sums of producer durations do not
measure either quantity.

Review the last available draft of every trial, including gate-rejected drafts
and drafts preceding a later error, unless a hard stop prevents further calls.
The blind reviewer receives one candidate and the full fixture context/rubric;
it receives no treatment, provider, gate score, attempts, transcript or logging
metadata. Bind gate and review results to the exact candidate hash. Report
planned, submitted, gated, reviewed, failed and unavailable denominators.

Compare paired B−A and C−B runtime outcomes within situation and gate provider.
Report distributions of attempts, tokens, queue time, provider time, wall time,
errors and known costs, plus batch throughput. Report categorical
`ready`/`revise`/`hold-for-review` transitions, supported hard breaches and each
dimension's ordinal grade distribution. Do not average ordinal grades or rank
`hold-for-review` below `revise`: one represents unresolved interpretation and
the other an identified correctable draft defect. Gate pass remains a separate
operational outcome.

For the ten-situation follow-up, aggregate paired effects by situation, weighting
each situation equally, and present situation-level effects and cluster bootstrap
intervals that resample whole situations with all provider/treatment observations
together. Preserve the pairing and report the small cluster count. Repeated
drafts or providers do not increase the number of independent situations. Report
missing-pair counts and sensitivity to excluding failed pairs; never interpret
the successful subset as the complete randomized comparison.

## Separate semantic investigation

The broad gate asks for confidence that the whole supplied passing condition is
satisfied. The graded reviewer asks whether the submitted route is defensible,
authorized and useful. A ready draft may correctly leave investigation or a
future action open. Model probability, rubric grade and readiness are distinct.
Treat a gate rejection plus a ready review as a disagreement candidate requiring
evidence review, rather than a proved gate error. Treat a pass plus a supported
hard breach similarly. Neither model is human ground truth.

Do not alter feedback, split the criterion or lower the threshold inside A/B/C.
Only propose a separate semantic treatment after auditing exact draft-level
disagreements for concrete supported defects, acceptable alternative routes,
authority ambiguity and provider/contract errors. A useful candidate treatment
can clarify that bounded investigation may be ready, or supply evidence-anchored
defect feedback; test each change independently against the unchanged gate.
Any additional feedback-generating call must have its own model, blinding,
request budget and cost allocation. Do not claim typed binary gate APIs provide
an explanation they do not return.

Threshold development must use separate development situations and independent
labels with a stated readiness target and false-acceptance cost. Freeze the
chosen criterion, threshold and adjudication rule before evaluating untouched
held-out situations. Keep entire situations and their alternatives in one split;
repeats, paraphrases and candidates from a development situation are not held
out. The ten v2 development situations cannot demonstrate generalization. If no
new held-out evidence is available, limit claims to development diagnostics.

Proceed to a fresh controlled rerun only after offline request-preservation,
budget, quiet-output and scheduling tests pass; evidence binding and denominator
checks pass; prices and a spending cap are frozen; and the owner separately
authorizes inference. Instrumentation defects require a fresh run after repair.
Quota/service failures require a separately budgeted completion plan with failed
attempts preserved. Any change to prompts, model profiles, criterion, threshold,
feedback or fixture hashes creates a distinct experiment and requires a new
frozen plan, not continuation under the old label.
