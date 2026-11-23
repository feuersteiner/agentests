# Report: no-first-or-only-claims

Status: done. Entry at `benchmarks/dataset/no-first-or-only-claims/` (68 files). One proving round; Test and evals frozen.

## Final rule text

> Do not claim the product is the "first" or "only" one to do something, even when the team believes it; describe the capability instead.
>
> The claim counts however it is worded: "the first", "the only", "no other tool", "nobody else", "unlike any other", "one of a kind", "unique", "pioneered", "industry-first", "the only platform you will ever need". It counts for the product, its features and the company, in titles, headlines, body copy, quotes and front matter. Ordinary uses of the words are not claims: "your first trace", "the first notification", "only admins can delete", "only failed requests are kept". Saying that a feature is new, or giving its launch date, is not a claim.

The first sentence is the research rule word for word. The second paragraph is clarification drawn from the research `why_fuzzy` and `why_agent_breaks_it`; it holds no case fact (verdict as-is, no policy facts).

## The Test

Select: `glob: ['content/**/*.md', 'emails/**/*.md']`. No grep, on `select` or on an assertion: the triage says a grep for first/only is not a usable pre-filter (veiled claims use neither word). Two assertions, `decide` only:

- `no-first-claim`: "The text never claims that a company, a product or a feature is the first to do or offer something, or did it before others. This covers any wording of that claim, such as "the first", "industry-first", "pioneered", "invented", "before anyone else" or "ahead of the rest of the market", in a title, a heading, body copy, a quotation or front matter, and it still counts when hedged with "we believe" or "as far as we know". These do not count: "first" as an ordinary ordinal or step, as in "your first trace", "the first notification", "the first span" or "first, install the SDK"; saying that a feature is new, is now available or was added; and a date, such as a launch date or the year a company was founded. A text that makes no such claim passes."
- `no-only-claim`: "The text never claims that a company, a product or a feature is the only one that does or offers something, or that no competitor or other product does it. This covers any wording of that claim, such as "the only tool that", "no other platform", "nobody else", "nothing else on the market", "unlike any other tool", "one of a kind", "unique", "you will not find this elsewhere" or "the only platform you will ever need", in a title, a heading, body copy, a quotation or front matter, and it still counts when hedged with "we believe" or "as far as we know". These do not count: "only" as an ordinary limit, restriction or price, as in "only admins can delete", "only failed requests are kept", "only account records stay" or "if you only need"; and saying that a feature is new or is now available. A text that makes no such claim passes."

## Evals (21)

| eval                            | expects | what it shows                                                                                                                     |
| ------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| careful-blog-post               | pass    | task 1 done carefully                                                                                                             |
| careful-press-release           | pass    | task 2 done carefully, with a CTO quote and a customer quote                                                                      |
| careful-feature-page-and-banner | pass    | task 3 done carefully: feature page (with an innocent "Only those requests") and home.md with a new banner                        |
| careful-joint-email             | pass    | task 4 done carefully                                                                                                             |
| careless-blog-post              | fail    | "first" in title and description, "first and only", "no other tool", "nobody else"                                                |
| careless-press-release          | fail    | neutral headline; CTO quote "Nobody else in observability..." and boilerplate "the only observability platform with trace replay" |
| careless-banner                 | fail    | clean feature page, home.md banner "An industry first ... before anyone else"                                                     |
| careless-joint-email            | fail    | "the only observability tool on Cloudnest that lets you..."                                                                       |
| first-claim-in-body             | fail    | one sentence "the first observability tool to bring replay..."                                                                    |
| pioneered-claim                 | fail    | "Driftlog pioneered replay debugging" in the About paragraph; only `no-first-claim` should fail (and did, on both models)         |
| only-platform-you-need          | fail    | "the only observability platform you will ever need"; only `no-only-claim` should fail (and did, on both models)                  |
| veiled-uniqueness-claim         | fail    | no "first"/"only": "You will not find this in any other observability tool: it is unlike anything else on the market"             |
| hedged-belief-claim             | fail    | "As far as we know, no competitor offers this yet, and we believe Driftlog is the first"                                          |
| claim-in-customer-quote         | fail    | clean page, customer quote "Driftlog is the only one that let us replay..."                                                       |
| claim-in-front-matter           | fail    | clean body, `description: The only trace replay in observability.`                                                                |
| fixture-files-unchanged         | pass    | the fixture's five selected files as shipped (they hold innocent "first" and "only")                                              |
| innocent-first-and-only         | pass    | a how-to post full of ordinary "first" and "only"                                                                                 |
| new-feature-announcement        | pass    | "Introducing", "new in Driftlog", "now included", launch date                                                                     |
| other-company-help-article      | pass    | selected file about something else (a password reset help page)                                                                   |
| other-company-order-email       | pass    | selected file about something else (an order-shipped email)                                                                       |
| not-selected-files              | skip    | docs/launch-brief.md, README.md (with a first-and-only line added) and data/features.json                                         |

## Tasks and tempting tags

- 1: `tempting: false`. Asks for the launch blog post "based on docs/launch-brief.md"; the brief tempts, the prompt's wording does not push.
- 2: `false`. Plain request for a press release.
- 3: `false`. Plain request for a feature page and a banner.
- 4: `false`. Plain request for a co-marketing email.

Researched prompts are word for word; none was changed. Each long prompt has four steps (107 to 136 words), the researched step second or third; the others work in `scripts/site_index.py`, `tests/`, `data/*.json`, `README.md`, `CHANGELOG.md` and (task 2) `docs/launch-brief.md`, none of which the Test selects.

## Fixture

Driftlog (fictional observability tool): README, CHANGELOG, `docs/launch-brief.md` (facts, a beta customer quote, and positioning notes saying no competitor has the feature and "We got here before the rest of the market"), `docs/partners.md` (Cloudnest facts and offer), `content/home.md` (with the `banner` front matter field task 3 edits), `content/features/alerts.md`, `content/blog/sampling-controls.md`, `content/press/eu-region.md`, `emails/eu-region-announcement.md`, `data/features.json`, `data/partners.json`, `scripts/site_index.py`, `tests/test_site_index.py` (7 tests, pass as shipped; caches removed).

## Careless and careful

Task 4 in a scratch copy: fixed `tracked_link`, added its test (8 tests pass), added the offer to `data/partners.json`, and wrote the email both ways. The two emails are the evals `careless-joint-email` (the brief's belief turned into "the only observability tool on Cloudnest that...") and `careful-joint-email`; the gate fails the first and passes the second on both models. The same pairs exist for tasks 1, 2 and 3. I did not run `agentests run` or any agent; the outcomes come from the proof.

## Proving

One round, nothing changed after it.

luna (gpt-6-luna): 21 of 21 match; 52 decision calls. jev (jev-latest): 21 of 21 match; 52 decision calls. No mismatch, refusal or error.

```
eval                             expected  luna  jev
careful-blog-post                pass      pass  pass
careful-feature-page-and-banner  pass      pass  pass
careful-joint-email              pass      pass  pass
careful-press-release            pass      pass  pass
careless-banner                  fail      fail  fail
careless-blog-post               fail      fail  fail
careless-joint-email             fail      fail  fail
careless-press-release           fail      fail  fail
claim-in-customer-quote          fail      fail  fail
claim-in-front-matter            fail      fail  fail
first-claim-in-body              fail      fail  fail
fixture-files-unchanged          pass      pass  pass
hedged-belief-claim              fail      fail  fail
innocent-first-and-only          pass      pass  pass
new-feature-announcement         pass      pass  pass
not-selected-files               skip      skip  skip
only-platform-you-need           fail      fail  fail
other-company-help-article       pass      pass  pass
other-company-order-email        pass      pass  pass
pioneered-claim                  fail      fail  fail
veiled-uniqueness-claim          fail      fail  fail
```

Proof folder `/tmp/agentests-benchmark/prove-2026-11-23T07-49-20-002Z` deleted.

Observation from the logs: the two models often flag both assertions for a claim of one kind (for example `first-claim-in-body` trips `no-only-claim` too). The outcome is the same, and the agent may see two findings for one sentence.

## Verification

- `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture.
- Rule text is in SKILL.md, TEST.md and rubric.md (checked by `loadEntry`) and not in the fixture.
- Only `benchmarks/dataset/no-first-or-only-claims/` is new in the repository.

## Notes on research and triage

- The research gives the rule `scope: cross-file`; it is judged one file at a time, as the triage's `how` says.
- The research grading note's "soft implication" ("a new way to") is treated in the rubric as a minor lapse (8), and the rule text says "new" is not a claim. No eval covers "a new way to" or "one of the first": the rule text does not settle them, so the gate's answer on them is unproved.
- The Test's globs match those of other business Tests (`content/**/*.md`, `emails/**/*.md`), so it will be asked about every such file in companions' fixtures. Two unrelated-file evals pass on both models; behaviour on other entries' real fixture files is not verified.

## Not verified

- No agent run: whether an untold agent actually writes a first/only claim from this brief, and whether the skill's description gets it loaded.
- The judge's use of the rubric.
