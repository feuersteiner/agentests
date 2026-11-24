# Complex support suite: ten situations, fifty alternatives

The [fixed registry](complex-support-suite.json) contains exactly ten independent
source-grounded fictional business situations. Each situation has five completed
external replies and internal plans. The frozen [case 01](complex-support-01/README.md)
and the separate [five-refund pilot](README.md) retain their original bytes and
packet hashes. The refund records do not count toward this suite.

A future complete assessment would request 300 dimensional assessments and fifty
integrated judgments per model per repeat: six dimensions per candidate pair.
Those are **ten independent situations**, not 300 independent cases. Repeats and
alternative drafts do not increase the number of situations. All expectations
remain **synthetic, provisional, and not human reviewed**. Independent agent
review does not establish human labels or empirical evaluator validity.

## Offline commands

From the repository root with locked dependencies installed and core built:

```sh
# Full integrity: inputs, provenance, local source hashes, reviewer references.
bun --no-env-file run --cwd benchmark/v2/workbench dossier:validate:suite
bun --no-env-file --no-install benchmark/v2/workbench/dossier-cli.ts validate --case complex-support-02

# Input-only preparation: no reviewer or provenance files are opened.
bun --no-env-file run --cwd benchmark/v2/workbench dossier:prepare:suite
bun --no-env-file --no-install benchmark/v2/workbench/dossier-cli.ts prepare --case complex-support-02
bun --no-env-file --no-install benchmark/v2/workbench/dossier-cli.ts prepare --suite \
  --out benchmark/v2/results/prepared/review-suite
bun --no-env-file --no-install benchmark/v2/workbench/dossier-cli.ts --help
```

The existing `dossier:validate` and `dossier:prepare` commands still default to
case 01. The CLI exposes only `validate` and `prepare`; no grading command exists.
Validation writes nothing. Neither command loads environment files, imports
provider clients, requests credentials or performs network calls. Research URL
verification is separate from these offline checks.

Preparation writes only inside ignored `benchmark/v2/results/prepared/` and
refuses traversal, symlink redirection and existing destinations. The default
suite destination is `benchmark/v2/results/prepared/suite/`. It contains a suite
`inventory.json`, ten explicit case subdirectories, and five packets plus a case
inventory in each. Single-case preparation defaults to a directory named for its
case. Every output inventory identifies input-only integrity; run full validation
separately before claiming complete provenance/reviewer integrity. Preparation
can succeed with reviewer files absent, which is a deliberate privacy boundary.

Every assessment packet includes the task, normative rubric and response schema,
the identical complete ordered context for that situation, and exactly one
candidate. Deep contract allowlists reject nested rubric/schema annotations.
Candidate projection includes only the reply/plan span IDs and text. Reviewer
expectations, summary, provenance selection notes, manifest label metadata and
other candidates are excluded. Full validation separately checks their hashes
and references. A reviewer canary cannot change a packet byte.

## Fixture contract and inventory

Each registered case has one scenario, 15–25 ordered documents, at least 8,000
context words, and exactly five neutral `p01`–`p05` candidates. The six stable
dimensions use case-specific ordinal 0–3 anchors, evidence/span citations and
confidence separate from grade. Supported unresolved critical breaches block
readiness while preserving the entire dimensional profile. Multiple defensible
routes and genuine interpretation disagreements remain in reviewer material.

[The public measured fixture inventory](suite-inventory.json) records exact
per-document context sizes, reply/plan sizes, and complete serialized packet
sizes and SHA-256 values. These are fixture measurements, not model context-use
measurements. Words are nonempty whitespace-delimited sequences and bytes are
UTF-8; serialized packet bytes include JSON overhead. Tokenizer and token counts
remain null because no named tokenizer and encoding are configured.

Source counts vary with the actual grounding needed. Every source must retain a
verified HTTPS URL, retrieval URL, stable identifier, actual retrieval date,
attributed local paragraph, its SHA-256, reuse basis and update uncertainty.
The local paragraph hash is explicitly **not an original webpage hash**. Undated
living pages may use `publicationDate: null` only when `updateUncertainty`
explicitly includes `publication-date-unknown`; this prevents inventing dates.
A dated value and every retrieval date must be valid calendar dates. Public
readability does not imply transcript reuse permission: this suite uses original
brief factual paraphrases, zero quoted words, and authored fictional records.

| Situation                                          | Title                                       | Documents | Context words | Context bytes | Candidates | Primary grounding                                                                                                                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------------- | --------: | ------------: | ------------: | ---------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [complex-support-01](complex-support-01/README.md) | Exceptional usage invoice and continuity    |        20 |        10,114 |        68,686 |          5 | [S01](https://www.reddit.com/r/webdev/comments/1b14bty/netlify_just_sent_me_a_104k_bill_for_a_simple/), [S02](https://news.ycombinator.com/item?id=39521986); [all sources](complex-support-01/sources.json)                                                     |
| [complex-support-02](complex-support-02/README.md) | Security incident during enterprise renewal |        20 |         9,960 |        68,296 |          5 | [S01](https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/), [S02](https://sec.okta.com/october-security-incident-recommended-actions); [all sources](complex-support-02/sources.json)                     |
| [complex-support-03](complex-support-03/README.md) | Data loss and recovery                      |        20 |         9,351 |        63,728 |          5 | [S01](https://about.gitlab.com/blog/2017/02/01/gitlab-dot-com-database-incident/), [S02](https://github.blog/news-insights/company-news/oct21-post-incident-analysis/); [all sources](complex-support-03/sources.json)                                           |
| [complex-support-04](complex-support-04/README.md) | Grandfathered pricing and disputed notice   |        20 |         9,775 |        65,374 |          5 | [S01](https://37signals.com/podcast/rework-live/), [S02](https://signalvnoise.com/posts/1287-ask-37signals-how-did-you-come-up-with-pricing-for-your-products); [all sources](complex-support-04/sources.json)                                                   |
| [complex-support-05](complex-support-05/README.md) | Failed enterprise implementation            |        20 |         9,616 |        66,038 |          5 | [S01](https://learn.microsoft.com/en-us/dynamics365/guidance/implementation-guide/prepare-go-live-checklist), [S02](https://docs.stripe.com/webhooks); [all sources](complex-support-05/sources.json)                                                            |
| [complex-support-06](complex-support-06/README.md) | Accessibility complaint before launch       |        20 |        10,252 |        69,906 |          5 | [S01](https://www.w3.org/TR/2024/REC-WCAG22-20241212/), [S02](https://www.w3.org/WAI/test-evaluate/preliminary/); [all sources](complex-support-06/sources.json)                                                                                                 |
| [complex-support-07](complex-support-07/README.md) | Marketplace transaction dispute             |        20 |         9,958 |        66,268 |          5 | [S01](https://www.ebay.com/help/policies/ebay-money-back-guarantee-policy/ebay-money-back-guarantee-policy?id=4210), [S02](https://www.ebay.com/help/policies/selling-policies/seller-protection-policy?id=4345); [all sources](complex-support-07/sources.json) |
| [complex-support-08](complex-support-08/README.md) | Account suspension appeal                   |        20 |         9,048 |        63,047 |          5 | [S01](https://docs.github.com/en/site-policy/acceptable-use-policies/github-appeal-and-reinstatement), [S02](https://docs.github.com/en/site-policy/acceptable-use-policies/github-active-malware-or-exploits); [all sources](complex-support-08/sources.json)   |
| [complex-support-09](complex-support-09/README.md) | Data residency commitment                   |        20 |         9,790 |        67,422 |          5 | [S01](https://support.atlassian.com/security-and-access-policies/docs/understand-data-residency/), [S02](https://support.atlassian.com/security-and-access-policies/docs/move-data-to-another-location/); [all sources](complex-support-09/sources.json)         |
| [complex-support-10](complex-support-10/README.md) | Product retirement and migration            |        20 |         9,298 |        63,127 |          5 | [S01](https://devcenter.heroku.com/changelog-items/2461), [S02](https://help.heroku.com/RSBRUH58/removal-of-heroku-free-product-plans-faq); [all sources](complex-support-10/sources.json)                                                                       |

## Capability boundary

**Graded evaluation is not implemented.** Core returns binary findings and
passing probabilities/scores, including from `reason`; its criteria arrays use
the maximum passing score and a cleared escalation stage skips later stages.
Neither probabilities nor multiple binary assertions implement the structured
ordinal assessment contract. A structured-output execution adapter is the next
separately scoped technical decision, followed by human label review and any
separately authorized empirical evaluation. No measured runs, producer calls,
calibration, paid inference or core rewrite are part of this fixture suite.

Measured evidence and construction history follow the
[private evidence policy](../../evidence/EVIDENCE.md), outside public fixtures.
