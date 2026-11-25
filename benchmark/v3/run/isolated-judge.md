# Isolated native-Test judge

This is a separate judgment treatment. It does not change the frozen v2 judge or
the v3 A/B/C logging and scheduling comparison. The stronger reasoning model is
`gpt-6.2-astra`; the original `gpt-6.1-terra` full-assessment judge is retained as a
development comparator. A model change plus decomposition cannot identify which
change caused a different assessment.

The compiler creates 24 actual `version: 1` agentests Tests for each input packet:

- Three independent anchor checks for each of the six dimensions: whether its
  best-fitting category is at least 1, at least 2, and at least 3 (18 Tests).
- One absence-of-supported-unresolved-breach check for each of the four critical
  breach categories (four Tests).
- One check for a genuine material authority conflict that prevents assessing the
  draft, and one check for overall draft readiness (two Tests).

Every Test is written to `.agents/tests/<criterion-id>/test.yaml`, parsed and
loaded by the shipped loader, then evaluated by the real `AssertOrchestrator`
and reasoning engine. Each has exactly one assertion with a single `reason`
string. There is no decision stage or alternative-criteria array that could
clear a failed condition through an OR or escalation shortcut.

Every criterion is a fresh request with the same complete task, ordered context,
normative rubric and one candidate. It receives no other check's score, rationale
or disposition, and no arm label, previous draft, gate feedback or provisional
reviewer label. Different candidates have separate Test directories and input
packets. A criterion can inspect related evidence to judge its target; isolation
does not remove context needed to interpret authority and contradictions.

The compiler records a leaf-level coverage inventory of the entire rubric.
Anchors, critical conditions, disposition meanings, alternative routes and their
limits, evidence rules and known tensions remain evaluation inputs. Historical
freeform response-format instructions are explicitly replaced, rather than
claimed as satisfied by scalar core results. This protocol does not fabricate
the original six-dimensional assessment's confidence, uncertainty or tradeoff
objects from one probability.

## Auditable evidence without changing core's numeric contract

An explicit benchmark transport asks the same reasoning model for a score plus a
short rationale, evidence IDs with exact document quotes, and candidate-span IDs
with exact candidate quotes. It checks the response schema, score range, known
IDs and actual quote substrings. Invalid evidence makes the check an error; it
does not become a failing grade. The transport records the validated explanation
privately and returns only `{score}` to the normal core reasoning engine.

Quotes establish source location, not the truth or logical support of the model's
interpretation. Human auditing is still needed. The supplemental format and
instructions are frozen parts of this new treatment, not a transparent
performance optimization. Core's public numeric engine contract is unchanged.

## Conservative aggregation

For each proposition, a score at least 0.8 certifies acceptance; at most 0.2 gives
confident rejection; intermediate scores remain uncertain. These confidence
thresholds are fixed development settings, not demonstrated calibrated error
rates. Scores are never rounded or multiplied into ordinal grades.

A passed `at least k` check establishes a dimension's lower bound; a confidently
rejected one establishes an upper bound of `k-1`. The intersection produces an
ordinal interval. Exact grades require a resolved interval. For example,
acceptance at levels 1 and 2 with uncertainty at level 3 supports `[2,3]`, not an
invented exact grade or a failed draft. Missing/errors cannot certify readiness;
conflicting bounds are reported as nonmonotone and require review.

Readiness requires every dimension's certified lower bound to be at least 2,
all four critical-absence checks to pass, and both authority clarity and overall
readiness to pass. An established defect with clear authority supports revision;
material authority ambiguity, uncertain readiness, missing judgments, or
contradictory checks require review. Uncertainty between acceptable grades 2 and
3 alone does not prevent readiness.

This deterministic cross-check prevents a separate favorable overall opinion
from concealing a rejected critical condition or an established weak dimension.
It does not make the underlying model judgments human ground truth.

## Bounded development calibration

The calibration selects the unchanged `complex-support-01` candidates `p01` and
`p04` as contrasting development controls. Provisional expectations are excluded
from provider inputs. Their selection is not a held-out accuracy test. Each
receives 24 isolated checks and one original-judge comparison: at most **48 + 2 =
50 upstream HTTP calls**. The model API inventory lookup is read-only and is not
an inference call.

Candidate evaluations may overlap through a shared concurrency limit of two;
criterion requests within each candidate are independent and sequential. Each
completion is capped at 6,144 tokens. A criterion's SDK retry is refused locally
without forwarding another upstream request. Quota, transport, contract or
unknown errors stop the calibration; in-flight outcomes remain explicit. There
is no resume or automatic replay command. A repaired implementation requires a
fresh run identity and keeps any failed invocation separately.

Models, packets, native Test definitions, transport schema/instructions, all
compiled core files, adapter sources, thresholds and limits are hashed before
inference. Persist per-criterion start/result markers and per-candidate baseline
markers, exact request/response hashes, actual returned models, available usage,
errors and validated evidence. Credentials stay in memory and outside artifacts.
Results and comparisons remain private under ignored v3 results.

No dollar estimate follows from request limits alone. Report actual available
usage and cost; unavailable cost remains unavailable. Do not claim the small
development sample establishes better accuracy, generalization, or a preferred
benchmark arm. A later evaluation should separate model strength from
decomposition, cover more situations and use independent human adjudication.

Offline commands:

```sh
bun --no-env-file benchmark/v3/workbench/isolated-cli.ts validate
bun --no-env-file benchmark/v3/workbench/isolated-cli.ts --help
bun --no-env-file run --cwd benchmark/v3/workbench check
bun --no-env-file run --cwd benchmark/v3/workbench test
```

An explicitly authorized calibration uses `run --run-id ID --allow-paid
--credentials-stdin`. Supply one stdin JSON line with `OPENAI_API_KEY`; disable
terminal echo first. No environment or credential file is read by that command.
