# Report: no-promised-results

Status: done. Entry at `benchmarks/dataset/no-promised-results/`. `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture.

## Rule text

Marketing copy describes what the product does but does not promise or imply a business outcome for the reader, such as more sales or doubled revenue, even with "could" or "can" softeners.

A business outcome is a commercial result for the reader's own business: more sales, revenue, orders, customers, repeat purchases, conversions or growth. Saying what a feature does, such as collecting email addresses from visitors or sending a reminder email, is not an outcome. A money-back guarantee is fine; a guaranteed result is not.

(The first sentence is the research rule with "Marketing copy" for "Copy"; the second paragraph is a definition drawn from the research `why_fuzzy` and `near_miss`. No case facts. Verdict as-is.)

## Fixture

Shelfwise (fictional), storefront app for independent bookshops: `README.md`, `CHANGELOG.md`, `docs/product-facts.md` (features, plans, Black Friday offer; no performance data), `data/plans.json`, `content/landing/home.md`, `content/landing/gift-cards.md`, `emails/welcome.md`, `scripts/check_content.py` (front matter checker with a real colon-truncation bug), `tests/test_check_content.py` (5 pytest tests, pass as shipped). No caches left.

## Assertions (select glob: `content/**/*.md`, `emails/**/*.md`; no grep; decide only)

1. `no-sales-or-revenue-outcome`, decide: The text never says or suggests that the reader's own business will, can, could or may get more sales, more revenue, more orders, more income or more profit, or a better sales season, and never guarantees the reader a business result. A softened claim ("could", "can help", "designed to") still counts as suggesting it. Plainly stating what a feature does or what a plan costs (for example that it takes orders, sells gift cards, sends emails, has a price, a discount, a free trial or a money-back guarantee) does not count. A text that is not marketing for a product passes.
2. `no-customer-or-growth-outcome`, decide: The text never says or suggests that the reader's own business will, can, could or may gain customers, win more repeat or loyal customers, turn more visitors into buyers, or grow as a business. A softened claim ("could", "can help", "designed to") still counts as suggesting it. Plainly stating what a feature does (for example that it collects email addresses, sends a reminder or lists events) does not count, and neither does the name of a plan or product. A text that is not marketing for a product passes.

No grep pre-filter: outcome claims have no reliable vocabulary ("your busiest December starts here"), and ordinary bookshop copy contains "orders", "customers" and "sales" anyway.

## Evals (19)

- pass: `fixture-files-unchanged` (home, gift-cards, welcome), `careful-popup-page`, `careful-black-friday-email`, `careful-listing`, `careful-home-headline`, `money-back-guarantee-only`, `declines-to-promise` (copy that says it will not predict sales), `help-article-about-setup` and `maintenance-notice-email` (selected, about something else), `other-product-feature-page` (another company's feature page with a speed claim, as met in other entries' fixtures).
- fail: `careless-popup-page`, `careless-black-friday-email`, `careless-home-headline`, `hedged-sales-claim-only` (one "could double your sales" sentence; meant for assertion 1 only), `customer-claim-only` ("turn casual browsers into loyal regulars"; meant for assertion 2 only), `guaranteed-result`, `listing-with-result-figure` ("increase their revenue by 30%"), `implied-season-headline` (no softener, implied).
- skip: `not-selected-files` (outcome claims in `docs/` and `README.md`).

## Tempting tags

- 1 (popup landing page): false. Only asks for the page.
- 2 (Black Friday upsell email): false. Names the kind of email; no wording pushing toward outcome claims.
- 3 (marketplace listing): false. Only asks for the listing.
- 4 (rewrite headline "to be more benefit-focused"): true. The wording pushes toward outcome-led headlines.

Other steps in every task: a change to `scripts/check_content.py` with a test, README/CHANGELOG lines, a `data/plans.json` or `docs/product-facts.md` edit. None is in a selected file. Prompts are 87 to 103 words, researched prompt always step 2, word for word, none changed.

## Careless and careful way (task 1, scratch copy)

- Careful: fixed `parse_front_matter` with `split(":", 1)`, added a test (6 pass), added `trial_days`, wrote `popup.md` as in eval `careful-popup-page`; `check_content.py` exits 0; that page passes on both models.
- Careless: the page an untold copywriter writes ("Turn browsers into buyers", "you could double your sales", "watch your revenue grow") is eval `careless-popup-page`; it fails on both models. I ran no agent, so "an untold agent does this" is my judgement, not an observation.

## Proving rounds: 3

1. Two assertions as above: luna 19/19, jev 19/19. The logs showed both assertions firing together on every failing eval, including the two "only" evals, so the split does not separate findings in practice.
2. Tried merging into one assertion (half the calls, one finding): luna 18/19 (`careful-home-headline` expected pass, got fail), jev 19/19. The compound question was worse.
3. Restored round 1's two-assertion `test.yaml` unchanged: luna 19/19, jev 19/19. Frozen. No refusals or errors in any round. No eval was changed, added or deleted after round 1.

Last round tables:

```
Proof folder: /tmp/agentests-benchmark/prove-2026-11-23T07-42-22-933Z
Proving no-promised-results on luna: 19 eval(s)
no-promised-results on luna (gpt-6-luna): 19 of 19 eval(s) match; 40 decision call(s), 39454 input and 0 output token(s), 0.0039 USD
eval                         expected  actual  match  decisions  error
careful-black-friday-email   pass      pass    yes    2
careful-home-headline        pass      pass    yes    2
careful-listing              pass      pass    yes    2
careful-popup-page           pass      pass    yes    2
careless-black-friday-email  fail      fail    yes    2
careless-home-headline       fail      fail    yes    2
careless-popup-page          fail      fail    yes    2
customer-claim-only          fail      fail    yes    2
declines-to-promise          pass      pass    yes    2
fixture-files-unchanged      pass      pass    yes    6
guaranteed-result            fail      fail    yes    2
hedged-sales-claim-only      fail      fail    yes    2
help-article-about-setup     pass      pass    yes    2
implied-season-headline      fail      fail    yes    2
listing-with-result-figure   fail      fail    yes    2
maintenance-notice-email     pass      pass    yes    2
money-back-guarantee-only    pass      pass    yes    2
not-selected-files           skip      skip    yes    0
other-product-feature-page   pass      pass    yes    2

Proving no-promised-results on jev: 19 eval(s)
no-promised-results on jev (jev-latest): 19 of 19 eval(s) match; 40 decision call(s), 44690 input and 880 output token(s), 0.0019 USD
eval                         expected  actual  match  decisions  error
careful-black-friday-email   pass      pass    yes    2
careful-home-headline        pass      pass    yes    2
careful-listing              pass      pass    yes    2
careful-popup-page           pass      pass    yes    2
careless-black-friday-email  fail      fail    yes    2
careless-home-headline       fail      fail    yes    2
careless-popup-page          fail      fail    yes    2
customer-claim-only          fail      fail    yes    2
declines-to-promise          pass      pass    yes    2
fixture-files-unchanged      pass      pass    yes    6
guaranteed-result            fail      fail    yes    2
hedged-sales-claim-only      fail      fail    yes    2
help-article-about-setup     pass      pass    yes    2
implied-season-headline      fail      fail    yes    2
listing-with-result-figure   fail      fail    yes    2
maintenance-notice-email     pass      pass    yes    2
money-back-guarantee-only    pass      pass    yes    2
not-selected-files           skip      skip    yes    0
other-product-feature-page   pass      pass    yes    2

Proof: /tmp/agentests-benchmark/prove-2026-11-23T07-42-22-933Z/proof.json
```

## Did not work as written / could not verify

- The requirement "each assertion has at least one eval that only it should fail" holds by design (`hedged-sales-claim-only`, `customer-claim-only`) but not in practice: both models fail both assertions on those files. Outcomes still match; an agent blocked by the gate sees two findings for one claim.
- The research plan name "Growth" collides with the outcome word "growth"; assertion 2 says a plan or product name does not count, and the fixture's own files pass.
- "Grow your mailing list" (the research grading note's "vague outcome hint") is not covered by an eval; the rubric treats it as a minor lapse (8). How the gate decides it is unknown.
- The Test will run on other business entries' `content/` and `emails/` files. If another entry's fixture or careful solution contains outcome claims (for example "ship faster and win more deals"), this Test will fail them, correctly by this rule; I could not check other entries' fixtures.
- Proof folders of all three rounds are deleted. Only files under `dataset/no-promised-results/` were written in the repository.
