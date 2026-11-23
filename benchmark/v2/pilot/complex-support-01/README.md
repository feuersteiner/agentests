# Complex support dossier: one situation, five alternatives

This separate fixture reviews a completed customer reply **and its internal
action plan** against twenty ordered business records. HarborEdge and Aster Studio
are fictional. The context combines a dramatic usage invoice, collected funds,
uncertain notice and traffic, mixed downstream availability needs, conflicting
publishing evidence, conditional financial authority, renewal pressure, privacy,
and consent-dependent mitigation and exit options.

The public factual inspiration is the February–March 2024 Netlify billing
dispute. The historical company waiver is settled; this fixture does not assess
historical employees or offer denial as an alternative historical outcome.
All business dialogue, contracts, limits, policies and candidates are authored
synthetic reconstruction. Public sources appear only as attributed factual
paraphrases in E01. No transcript redistribution license is asserted, and no raw
pages, screenshots, real visitor identifiers or customer domains are included.

Source dates, update uncertainty, reuse basis and local-paraphrase SHA-256 values
are recorded in [sources.json](sources.json). Those values are **not original
page hashes**. The source record includes the [customer report](https://www.reddit.com/r/webdev/comments/1b14bty/netlify_just_sent_me_a_104k_bill_for_a_simple/),
the [CEO response](https://news.ycombinator.com/item?id=39521986),
the [official apology repost](https://answers.netlify.com/t/limit-bandwidth-to-avoid-high-billing-caused-by-ddos/13086/16),
the [February 29 support statement](https://answers.netlify.com/t/add-automated-kill-switch-or-rate-limiting-to-prevent-excess-billing-from-ddos-attacks/113359/8),
the [customer's later information receipt](https://answers.netlify.com/t/i-am-the-op-of-that-104k-bill-post-and-i-have-some-follow-up-questions/113472/9),
a [later October policy statement](https://answers.netlify.com/t/clarification-on-ddos-attack-fees-and-protections-100k-charge/127953/3),
and [current website terms](https://www.netlify.com/legal/terms-of-use/).
Later statements and current terms do not establish earlier policy or licensing.

## Contract and separation

[manifest.json](manifest.json) freezes ordered document, candidate, task, rubric,
schema, provenance and reviewer-file bytes with SHA-256. The fixture contains
exactly one situation. Its five candidates are alternative completed replies and
plans, not five independent business cases. Candidate filenames are neutral.
All candidate judgments remain **synthetic, provisional and not human reviewed**.

[rubric.json](rubric.json) gives visible 0–3 ordinal anchors for policy/authority,
factual uncertainty/commitments, support usefulness, brand tone, sales ethics and
commercial judgment, and integrated consistency. Every assessment needs evidence
IDs and exact reply/plan span IDs. Confidence is separate from quality. There is
no weighted average that can hide a critical breach. Integrated disposition is
`ready`, `revise`, or `hold-for-review`, with tradeoffs, uncertainties and rationale.
Readiness concerns the submitted draft, not whether the underlying account is
resolved. A responsible pending-review plan can be ready.

[response.schema.json](response.schema.json) defines the requested structured
assessment; no model assessment has been fabricated. Reviewer-only
[expectations.json](reviewer/expectations.json) supplies provisional per-dimension
ranges, evidence and span references, integrated alternatives and uncertainty.
It includes distinct defensible immediate-remedy and bounded-review routes, an
externally polished harmful plan, an incomplete response, and an authority dispute.
Case-specific accepted routes and ranges are never included in model packets.
[summary.json](summary.json) is a provenance/claim navigation aid and is also
excluded. No construction reports or private raw history are fixture inputs.

## Offline commands

From the repository root, using existing installed workspace dependencies:

```sh
bun --no-env-file run --cwd benchmark/v2/workbench dossier:validate
bun --no-env-file --no-install benchmark/v2/workbench/dossier-cli.ts --help
bun --no-env-file run --cwd benchmark/v2/workbench check
bun --no-env-file run --cwd benchmark/v2/workbench test
```

Validation writes no artifacts. It checks frozen hashes, versions, IDs and
references, provenance, local paraphrase sizes, rubric/schema bounds and the
multiple-alternative reviewer contract. It performs no network requests and
imports no provider code. Preparation does not read reviewer files; validate
separately to check their integrity.

```sh
bun --no-env-file run --cwd benchmark/v2/workbench dossier:prepare
```

Preparation writes five deterministic JSON packets plus a size/hash inventory to
ignored `benchmark/v2/results/prepared/complex-support-01/`. It refuses an existing
output directory. For a fresh alternate destination, from the repository root:

```sh
bun --no-env-file --no-install benchmark/v2/workbench/dossier-cli.ts prepare \
  --out benchmark/v2/results/prepared/complex-support-01-review-copy
```

Output must stay beneath ignored `benchmark/v2/results/prepared/`; existing
symlink ancestors are rejected. Each packet includes the task, normative rubric
and output schema, the same complete ordered context, and exactly one candidate.
Reviewer expectations, labels, rationale ranges, source-selection notes, summary,
manifest metadata and other candidates are excluded through an input allowlist.
Candidate span IDs remain for citations; neutral candidate filenames remain in the
local inventory rather than the assessment input. No model command is provided.

Sizes are measured as UTF-8 bytes and nonempty whitespace-delimited words, not
estimated tokens. The inventory reports the twenty-document context separately
from complete packet sizes, which also include task, rubric, schema, candidate
and JSON serialization. No named tokenizer/encoding is configured, so token
counts are unavailable. The manifest records the frozen context measurement;
validation prints actual per-candidate and complete packet sizes and hashes.

Frozen context: **20 documents, 10,114 words, 68,686 bytes**. Complete serialized
packets range from **88,882 to 92,162 bytes**. Candidate text sizes exclude JSON
keys and span identifiers:

| Candidate | Reply words | Plan words | Reply bytes | Plan bytes | Complete packet bytes |
| --------- | ----------- | ---------- | ----------- | ---------- | --------------------- |
| p01       | 323         | 263        | 2,071       | 1,875      | 91,963                |
| p02       | 353         | 274        | 2,255       | 1,890      | 92,162                |
| p03       | 137         | 168        | 839         | 1,092      | 89,871                |
| p04       | 86          | 76         | 509         | 458        | 88,882                |
| p05       | 172         | 204        | 1,111       | 1,315      | 90,366                |

## Capability boundary

**Graded evaluation is not implemented.** The existing public `agentests` core
returns findings from thresholded passing probabilities/scores. Its reasoning
engine also returns a score, not this response object. Arrays of criteria take
the maximum passing score, and an assertion stage that clears bypasses later
stages. Neither confidence probabilities nor multiple binary assertions supply
the six ordinal grades, citations, tradeoffs and integrated disposition here.

The next decision is a separately scoped structured-output execution adapter or
library extension, followed by human review of the fixture and provisional
expectations before any measured evaluation. No paid inference, calibration,
grade conversion, core rewrite, result claim, commit or upload is part of this
preparation. The original five pilot inputs, packet hashes and harness remain
unchanged. Run evidence and construction history follow the
[private-evidence policy](../../../evidence/EVIDENCE.md).
