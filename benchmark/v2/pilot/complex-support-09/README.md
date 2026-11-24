# Data residency commitment across a regional service

ValeGrid and Bracken Municipal Services are fictional. At the September 16,
2026 12:00 UTC cutoff, broad sales assurances conflict with verified regional
content stores, global identity and telemetry, a historical overseas support
artifact, optional connector processing and an ambiguous signed annex. The
customer needs a useful statement for its next-day supplier review. A supported
production change has test, outage, consent and residual-copy limitations.

The dossier has one situation, twenty ordered records and five completed
external-reply/internal-plan alternatives. All business dialogue, policies,
contracts, authority, dates and financial limits are independently authored
synthetic context. The six-dimensional 0–3 assessment contract concerns draft
readiness; it does not execute service changes or infer contractual liability.
Graded model execution is not implemented. Reviewer expectations remain
**synthetic, provisional and not human reviewed**.

The primary grounding is current first-party documentation from
[Atlassian on residency scope](https://support.atlassian.com/security-and-access-policies/docs/understand-data-residency/),
[Atlassian on migration](https://support.atlassian.com/security-and-access-policies/docs/move-data-to-another-location/),
[Slack on regional data categories](https://slack.com/help/articles/360035633934-Data-residency-for-Slack),
[Microsoft on continuing transfers and remote access](https://learn.microsoft.com/en-us/privacy/eudb/eu-data-boundary-transfers-for-all-services),
and [Atlassian's subprocessor list](https://www.atlassian.com/legal/sub-processors).
These pages were retrieved November 23, 2026, after the fictional cutoff. They
supply attributed inspiration, without establishing fictional account facts or
backdating current vendor capabilities. [sources.json](sources.json) records
retrieval dates, unknown publication dates, the subprocessor list's displayed
December 19, 2026 future effective date, mutable-page uncertainty, stable
identifiers, reuse scope and local paraphrase hashes. No raw page, copied
transcript, screenshot, real customer data or open transcript license is supplied.
The S-prefixed paragraphs in E01 are original factual paraphrases; their hashes
are not original webpage hashes.

[manifest.json](manifest.json) freezes all assessment inputs and separate
provenance and reviewer files. Each packet contains the task, normative rubric,
response schema, identical complete ordered context and exactly one candidate.
[summary.json](summary.json) and
[reviewer/expectations.json](reviewer/expectations.json) are excluded from packets.
Case-specific alternative routes and grade expectations appear only in reviewer
material. The rubric permits general alternative courses without specifying a
preferred outcome. Candidate identifiers remain neutral.

The ordered context measures **9,790 whitespace-delimited words and 67,422 UTF-8
bytes**. Token counts are null because no named tokenizer and encoding are
configured. Reply and plan counts measure the concatenated span texts with
single newline separators, separately from JSON overhead. Full packet counts
measure actual compact serialized packet strings, including the full normative
contract and JSON overhead; these are fixture measurements, not model context
use or evaluation results.

| Candidate | Reply words / bytes | Plan words / bytes | Full packet words / bytes |
| --------- | ------------------- | ------------------ | ------------------------- |
| p01       | 120 / 773           | 148 / 980          | 11,005 / 87,982           |
| p02       | 410 / 2,704         | 299 / 2,077        | 11,442 / 91,113           |
| p03       | 240 / 1,601         | 192 / 1,311        | 11,168 / 89,167           |
| p04       | 389 / 2,558         | 291 / 2,094        | 11,414 / 90,958           |
| p05       | 92 / 565            | 89 / 550           | 10,919 / 87,319           |

Offline validation from the repository root, using existing workspace tools:

```sh
bun --no-env-file --no-install benchmark/v2/workbench/dossier-cli.ts validate --case complex-support-09
```

Validation checks frozen hashes, provenance, scope and reference integrity; it
performs no network or inference requests. Input-only preparation excludes
reviewer-file reads. Full validation separately checks reviewer references and
hashes. Generated packets belong only under ignored
`benchmark/v2/results/prepared/` via the documented workbench preparation
commands, never in this fixture directory. Human review and empirical evaluator
validation remain separate work.
