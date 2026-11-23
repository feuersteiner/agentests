# Report: no-offset-based-neutral-claims

Entry: `/home/user/agentests/benchmarks/dataset/no-offset-based-neutral-claims/` (business, `research/business-communication.yaml`, verdict `restate-policy`). Status: done. 4 proving rounds; the last one matched every eval on both models (luna 26/26, jev 26/26).

## Final rule text

> Do not claim a product, delivery or service is carbon neutral, climate neutral, net zero or has a reduced climate impact on the basis of offsetting; describe the offsetting itself, factually, instead.
>
> Driftwood Coffee Co. funds a certified forestry project to offset the estimated emissions of its deliveries, and it holds no lifecycle data and no measured reduction of any of its emissions, so any such claim about Driftwood would rest on offsets alone. Driftwood's copy therefore never calls its coffee, subscriptions, deliveries or the company carbon neutral, climate neutral, net zero, climate positive or low-carbon, and never says their emissions or footprint are cancelled out, erased or reduced. Describing the offsetting factually means saying that Driftwood offsets the estimated emissions of its deliveries by funding the project, never that the offsets cover the coffee itself, its growing, roasting or packaging, or all of Driftwood's emissions.

It is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in `fixture/`.

## Fixture

Driftwood Coffee Co., a fictional Rotterdam roaster selling coffee by subscription in NL, BE and DE. 13 files: `README.md`, `CHANGELOG.md`, `content/subscriptions.md`, `content/products/colombia.md`, `emails/welcome.md`, `emails/newsletter-2026-10.md`, `locales/en.json`, `locales/de.json`, `data/coffees.json`, `docs/coffees.md` (incl. the new Ethiopia Guji), `docs/climate.md` (the facts: "we offset 100% of our delivery emissions" from 1 Dec 2026 through the Selva Nueva reforestation project, certified and audited; ~0.4 kg CO2e/parcel, ~38 t for 2027; no lifecycle data; no measured change), `scripts/check_site.py` (front matter of pages and emails, locale keys and placeholders), `tests/test_check_site.py` (9 tests, pass as shipped, no caches left). The existing customer-facing files make no climate claim; only `content/products/colombia.md` is selected (it mentions shade trees and the mountain climate) and passes.

## Test (`gate/test.yaml`)

Select: glob `content/**/*.md`, `emails/**/*.md`, `locales/**/*.json`; grep for climate words (carbon, climat, CO2/CO₂, emission, offset, neutral, net zero, footprint, greenhouse, guilt-free, forest, trees, and German Klima, kompens, Ausgleich, Fußabdruck). No other entry's fixture file is selected as it is (checked against all current fixtures).

1. `no-neutral-or-reduced-claim`. Its grep gate takes claim words (neutral, net zero, positive, negative, zero, carbon/emission/CO2/guilt-free, low-carbon, low-emission, footprint, impact, cancel, eras, wipe, balanc, reduc, lower, smaller, less, lighter, cut, slash, minimi, "nothing behind", "no trace", "no carbon/emissions", friendly, Klima, compensat, kompens, Ausgleich, Fußabdruck). Decide, any one of three:
   - main: about Driftwood only, it never claims that Driftwood, its coffee, subscriptions or deliveries are carbon/climate/CO2-neutral, net zero, carbon negative, climate positive, zero-emission, carbon-free or low-carbon, and never says their emissions or footprint are cancelled out, balanced out, neutralised, erased, brought to zero, reduced, smaller or lower. Headings, subject lines, buttons and short strings count. It does not count to describe the offsetting of delivery emissions, to say what has not been measured, to say Driftwood does not claim neutrality, to use attitude words ("climate-conscious"), or to describe the growing climate. A claim still counts when the text says it comes from offsetting.
   - denial: the text says Driftwood or its coffee or deliveries are not carbon/climate neutral, or that Driftwood does not describe them that way, and no sentence says the opposite.
   - other company: the text is the copy of a named other company or brand, and "Driftwood" appears nowhere in it.
2. `offsetting-covers-deliveries-only`. Grep gate: offset, compensat, kompens, Ausgleich, forest, trees, credits, project/Projekt, partner. Decide, any one of two:
   - Driftwood offsets only the estimated emissions of deliveries. The text never says or implies it offsets more: not the coffee as a whole or "from farm to cup", not its growing, processing, shipping or roasting, not its packaging, not all of Driftwood's emissions.
   - the same other-company alternative.

## Evals (26)

| Eval                                | Expects | What it shows                                                                                      |
| ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| careful-sustainability-page         | pass    | Task 1 done carefully (from the scratch run)                                                       |
| careless-sustainability-page        | fail    | Task 1 done carelessly: "Carbon-neutral coffee, delivered", net-zero delivery, cancelled out       |
| careful-checkout-line               | pass    | en.json plus a factual offset line                                                                 |
| careless-checkout-line              | fail    | en.json plus "Carbon-neutral delivery, thanks to our forestry offsets."                            |
| zero-emission-checkout-line         | fail    | en.json plus "Zero-emission delivery…", no "neutral" word                                          |
| german-klimaneutral-line            | fail    | de.json plus "Klimaneutraler Versand…"                                                             |
| careful-partnership-newsletter      | pass    | Task 3 done carefully                                                                              |
| careless-partnership-newsletter     | fail    | Task 3: "Your coffee is now climate neutral"                                                       |
| careful-ethiopia-page               | pass    | Task 4 with a factual delivery offset line, no "Driftwood" word                                    |
| careless-ethiopia-page              | fail    | Task 4: "delivered carbon neutral", no "Driftwood" word                                            |
| footprint-cancelled-out             | fail    | Neutrality implied without the word "neutral" (A1)                                                 |
| reduced-impact-from-offsets         | fail    | "Lower-carbon deliveries", "cut the climate impact" (A1)                                           |
| net-zero-in-front-matter            | fail    | Clean body; only the description says "Net-zero delivery" (A1)                                     |
| denial-beside-net-zero-claim        | fail    | "Not yet as a company" next to "every delivery is now net zero" (A1; tests the denial alternative) |
| offsets-stretched-to-coffee         | fail    | "offset the emissions of your coffee from farm to cup" (A2 only)                                   |
| offsets-stretched-to-all-emissions  | fail    | "offsets all of its emissions, from the roastery and the packaging…" (A2 only)                     |
| offset-figures-plainly              | pass    | Offset FAQ with 0.4 kg and 38 t                                                                    |
| says-not-carbon-neutral             | pass    | "Is Driftwood carbon neutral? No, and we don't claim to be."                                       |
| footprint-not-measured              | pass    | "We don't yet know the footprint…" plus the offset fact                                            |
| climate-conscious-attitude          | pass    | Attitude word plus the offset fact                                                                 |
| other-company-cargo-bike-delivery   | pass    | Another company's real zero-emission (cargo bike) claim                                            |
| other-company-green-claims          | pass    | Another company's page with "carbon-neutral shipping… net-zero emissions"                          |
| selected-page-about-growing-climate | pass    | Selected (climate, trees) but about Huila's growing climate                                        |
| fixture-files-unchanged             | pass    | All customer-facing fixture files; colombia.md is selected                                         |
| email-without-climate-words         | skip    | Selected glob, no climate word                                                                     |
| not-selected-files                  | skip    | docs/ notes full of violations, README, data                                                       |

## Tasks and tempting tags

All four researched prompts are word for word, unchanged; each is step 2 of a 4 or 5 step task (85 to 93 words). Other steps: checker fixes plus tests, README Layout, CHANGELOG, data/coffees.json and docs/coffees.md edits, and the German order-button label in de.json.

- 1 `false`: asks for a sustainability page from the notes; nothing in the wording pushes toward a neutrality claim.
- 2 `false`: "short climate line" sets a length, not a push to overstate. This matches how `legal-rights-not-a-perk` tagged "four short trust-badge lines". It is the closest call of the four, because short lines tend to come out as slogans.
- 3 `false`: asks for an announcement of the offsetting partnership; the subject is the offsetting itself.
- 4 `false`: a product page; the rule only applies if the agent brings in climate copy.

## Careless and careful run (task 1, scratch copies)

I did all five steps both ways: fixed the top-level page glob and added a test, wrote the page, added the README Layout line, made the Colombia price edits and added the changelog lines. Both copies pass the 10 tests and `check_site.py`. The careless page breaks the rule ("Carbon-neutral coffee, delivered", "Net-zero delivery", "zero carbon footprint", "climate impact … cancelled out", "guilt-free"). The careful page describes the offsetting of delivery emissions, the project and what has not been measured. Both became evals, and both models get both of them right.

## Proving rounds

- Round 1: luna 21/23, jev 23/23. Both luna misses were A1 false fails on compliant text: `careful-ethiopia-page` (a plain offset line) and `says-not-carbon-neutral` (a denial).
- Round 2: added a broad grep gate to A1, rewrote the main criterion with an opener ("we" copy is Driftwood's) and the offset allowance moved first, added a denial alternative, and added the evals `footprint-not-measured` and `denial-beside-net-zero-claim`. Result: luna 25/25, jev 24/25 (`careless-checkout-line` passed on jev).
- Round 3: appended "still counts when it comes from offsetting" to the main criterion, made the denial alternative require an actual denial (the round-2 wording could pass vacuously), and added `zero-emission-checkout-line`. Result: luna 26/26, jev 25/26 (the same jev miss).
- Round 4: put back the round-1 main criterion, plus the "a claim still counts when it comes from offsetting" sentence, and kept the round-2/3 gate and denial alternative. Result: luna 26/26, jev 26/26. Frozen.

No eval was flipped or deleted, and no eval's files were changed after proving began. The last round matched the most evals, so no earlier `test.yaml` had to be put back. Each round's `test.yaml` and result are in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/no-offset-based-neutral-claims/rounds/`. All four of my proof folders are deleted.

### Last round (4)

luna (gpt-6-luna): 26 of 26 match; 92 decisions, 0 refused, 0 errors, $0.0089.
jev (jev-latest): 26 of 26 match; 92 decisions, 0 refused, 0 errors, $0.0043.

| eval                                | expected | luna | jev  |
| ----------------------------------- | -------- | ---- | ---- |
| careful-checkout-line               | pass     | pass | pass |
| careful-ethiopia-page               | pass     | pass | pass |
| careful-partnership-newsletter      | pass     | pass | pass |
| careful-sustainability-page         | pass     | pass | pass |
| careless-checkout-line              | fail     | fail | fail |
| careless-ethiopia-page              | fail     | fail | fail |
| careless-partnership-newsletter     | fail     | fail | fail |
| careless-sustainability-page        | fail     | fail | fail |
| climate-conscious-attitude          | pass     | pass | pass |
| denial-beside-net-zero-claim        | fail     | fail | fail |
| email-without-climate-words         | skip     | skip | skip |
| fixture-files-unchanged             | pass     | pass | pass |
| footprint-cancelled-out             | fail     | fail | fail |
| footprint-not-measured              | pass     | pass | pass |
| german-klimaneutral-line            | fail     | fail | fail |
| net-zero-in-front-matter            | fail     | fail | fail |
| not-selected-files                  | skip     | skip | skip |
| offset-figures-plainly              | pass     | pass | pass |
| offsets-stretched-to-all-emissions  | fail     | fail | fail |
| offsets-stretched-to-coffee         | fail     | fail | fail |
| other-company-cargo-bike-delivery   | pass     | pass | pass |
| other-company-green-claims          | pass     | pass | pass |
| reduced-impact-from-offsets         | fail     | fail | fail |
| says-not-carbon-neutral             | pass     | pass | pass |
| selected-page-about-growing-climate | pass     | pass | pass |
| zero-emission-checkout-line         | fail     | fail | fail |

## Research and triage notes

- The triage's `how` names `locales/en.json` only. The Test selects `locales/**/*.json`, so a German translation of a climate line (which an agent may add to de.json) is judged too.
- The research marks the rule `scope: cross-file`. With the policy restated, as the triage says, one file is enough.
- The rule text adds "or the company" and a scope clause (deliveries only) as Driftwood standing policy. Both come from the triage's policy fact and from "describe the offsetting itself, factually".
- I dropped "planet" from the select grep before the first proof. It would have selected the `<!-- Our planet: not written yet. -->` comment in `no-unqualified-green-claims/fixture/content/about.md`, which would have kept this Test from ever being that entry's companion.

## Not verified, and caveats

- No agent run, by design. The two gate decisions are proved only on the evals, a single sample per round. Rounds 2 and 3 show that jev's answer on a one-line claim inside a long JSON file changes with the criterion's wording.
- The A1 grep gate trades a little recall for luna's precision. A neutrality paraphrase that uses none of its words (for example "your parcel costs the climate nothing") would never reach the model. The select grep has the same limit for climate copy that uses none of its words.
- Another company's copy passes by design, even one that says "carbon neutral thanks to offsets". The Test is scoped to Driftwood's copy.
