# First pilot protocol

Business judgment: is this completed refund reply safe and useful to send?
The customer should understand the policy-grounded decision and next step,
without unsupported claims or a lost commitment. [test.json](test.json) is the
complete authoritative policy and rubric supplied to the evaluator.

There are exactly five fixed original records in [cases.json](cases.json). Each contains
a completed reply, verified case facts, prior commitments, and any verified
exception authority. The dataset was written for this pilot, independently of
any evaluator output; no producer is evaluated. Expected verdicts and rationales
are specified separately in [expectations.json](expectations.json), with no model
run used to select them. They remain synthetic, provisional, and not human reviewed.

The separate [complex support suite](COMPLEX-SUITE.md) contains ten
source-grounded fictional situations and fifty alternative reply/plan candidates.
It does not extend this original five-record dataset or use this binary runner.
Its ordinal rubric and structured output contract have offline preparation only;
graded execution is not implemented. Historical run evidence remains private;
frozen original fixture statuses do not describe current execution history.

| Case      | Scenario                                                                | Expected |
| --------- | ----------------------------------------------------------------------- | -------- |
| refund-01 | Eligible purchase; confirmation and realistic posting window            | pass     |
| refund-02 | Ineligible age; refund approved without exception authority             | fail     |
| refund-03 | Verified manager exception; existing submission commitment honored      | pass     |
| refund-04 | Exactly at eligibility limits; unsupported next-day posting guarantee   | fail     |
| refund-05 | Missing evidence; decision deferred and useful identification requested | pass     |

Packaging and inference:

1. Validate all five records, their separate labels, the policy assertion, and
   both provider profiles offline. Evidence packets contain only `context` and
   `completedReply`; case IDs, expected labels, rationales, and annotations stay
   out. The same packets and criterion are used across profiles and repeats.
2. Evaluate one packet at a time with the public agentests decision engine and
   assertion orchestrator. The policy is the assertion's passing condition, not
   an expected-answer hint. No selection filter or reasoning fallback is used.
3. The predeclared assertion threshold is **0.5** (runtime default): a decision
   score below 0.5 fails; equality passes. No threshold tuning or calibration
   claim follows from this pilot. Runtime scores are recorded as returned.
4. Persist label-free observations after each attempt. Only after all inference
   finishes, join provisional labels to produce `report.json`.

Missing evidence is judged through reply behavior: an appropriate deferral can
pass, while an unsupported approval fails. This is a binary assessment of the
reply, **not** a determination that a refund is eligible. There is no abstain
class. A runtime refusal, API failure, or invalid score is `inference-error` with
no verdict; errors never become policy violations or label disagreements.

## Commands

From `benchmark/v2/workbench/`, with existing dependencies and `core/dist`:

```sh
bun --no-env-file --no-install cli.ts --help
bun --no-env-file run validate --models luna,jev --repeat 3
bun --no-env-file --no-install cli.ts run --dry-run --models luna,jev --repeat 3
bun --no-env-file run check
bun --no-env-file run test
```

No command above performs live inference. With no command, the CLI validates.
`--dry-run` always forces offline validation. Validation prints only packet IDs,
sizes, hashes, and run counts; it does not need credentials or print replies.

Only this explicit command runs the real pilot:

```sh
bun --env-file=../../../.env --no-install cli.ts run --models luna,jev --repeat 3
```

The runtime reads only configured credential names from the inherited environment;
the harness never opens or prints `.env`. Bun loads that file for the explicit
live command. A run requiring one profile can use `--models luna` or `--models jev`.
Use `--repeat N` for consistency; the default is one repeat. Three repeats across
both profiles mean 30 logical decisions, with SDK retries possibly adding HTTP
attempts. No budget cap is enforced by the current public engine.

`--config FILE` accepts the same decision-setting shape as agentests:
`api`, `url`, `model`, `apiKeyEnv`, under `luna` and `jev`. The supplied settings
match core's Luna and Jev presets; change model IDs or safe endpoint URLs there
for an explicit comparison. URLs must pass core validation (no embedded secrets).
Provider/model/configuration and runtime hashes are retained in metadata. The
runtime eagerly requires a reasoning configuration even for decision-only tests;
the harness mirrors the selected decision settings into that unused slot with
`api: openai`, reusing its credential name. No reasoning call or fallback occurs.

## Reporting and interpretation

Each profile gets its own confusion matrix. A violation (`fail`) is the positive
class. False-alarm rate is false positives / completed expected-pass trials;
missed-violation rate is false negatives / completed expected-fail trials.
Accuracy uses all completed trials. Every rate includes its numerator and
denominator, and is `null` if its denominator is zero. Completion and error counts
are reported separately so missing answers cannot improve classification silently.

Consistency is the fraction of cases with unanimous binary verdicts across all
requested repeats, considering only cases with every repeat successfully completed.
Incomplete cases are counted separately. With one repeat, consistency is unavailable.
No state is carried between evaluations; provider caching or nondeterminism may
still affect repetitions. Repeats are not additional independent business cases.

Latency measures wall time around each runtime assertion, including SDK retries;
successful and failed attempts are summarized separately. The public engine exposes
only a score, so token usage, billed cost, HTTP attempt counts, and explanations
are unavailable. Cost and usage remain `null`, never invented zeros. The harness
counts logical engine invocations, not HTTP requests. Provider error text is
omitted to avoid persisting request data or credentials.

Exit codes: `0` means validation succeeded or all completed labels agree; `1`
means a label disagreement; `2` means setup or inference error, taking precedence.
An interrupted run may retain `status: running` and partial observations with no
final report. Runs are sequential and currently rely on provider/SDK timeout
behavior; there is no harness deadline or resume facility.

Limitations: five authored examples cannot cover the policy, establish reliability,
or support significance claims. The legitimate exception and boundary cases each
mix several business requirements; a binary result does not explain which requirement
drove it. The current runtime evaluates single sources, so one JSON evidence packet
stands in for a ticket, ledger, and reply; this does not test retrieval, evidence
provenance, multi-file reconciliation, or actual refund execution. Pilot development
data must remain separate from any future independently reviewed, held-out set.
