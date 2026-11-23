# Report: consumer-prices-include-vat

Status: done. Entry at `benchmarks/dataset/consumer-prices-include-vat/` (domain `business`,
research `research/business-communication.yaml`, verdict `restate-policy`). Three proving rounds;
the last round matched 26/26 on luna and 26/26 on jev, with no refusal and no error. The Test and
its evals are frozen.

## Starting point (the earlier worker's draft)

The draft had `benchmark.yaml`, `rubric.md`, `skill/SKILL.md` and `fixture/` in the entry, an empty
`gate/`, and a compiled Test with 19 evals in its scratch folder (`work/.../compile`), never proved
as far as I can tell. I checked every file against the runbook and kept most of it:

- Kept as is: the rule text, all four task prompts and tempting tags, the skill, the fixture's
  script, tests and copy, and all 19 draft evals (none changed, none flipped, none deleted).
- Fixed: `fixture/docs/campaigns.md` said the sale prices "are the `sale_net` entries", which
  equates the sale price with a net figure; now "are set by the `sale_net` entries" (neutral, true).
- Fixed: `rubric.md` was 60 lines, the runbook asks for under 60; merged one paragraph (59 now).
- Redone: the Test, compiled again in a fresh scratch copy of the fixture (`git init`, `init`,
  TEST.md, `validate`), revised through the proving rounds below, then copied into `gate/`.

## Final rule text

```
Prices shown to consumers include VAT and any compulsory fees; VAT-exclusive prices appear only where the audience is clearly businesses, and then with a prominent statement of the VAT rate or amount.

Snapframe sells only to consumers, so every page and every email is consumer-facing. The price shown for a product is the full price of one item: its net price from data/prices.yaml, plus 20% VAT, plus the compulsory £1 packaging fee per item. No net price, no price "+ VAT" and no price before the packaging fee appears in a page or an email, not even as a breakdown beside the full price. The full prices are:

- Classic prints, pack of 50: £10.00 (net £7.50)
- A4 framed print: £25.00 (net £20.00)
- A3 canvas print: £35.50 (net £28.75); in a seasonal sale £29.50 (net £23.75)
- Photo book, 20 pages: £22.00 (net £17.50); in a seasonal sale £19.00 (net £15.00)
- Photo mug: £11.80 (net £9.00); in a seasonal sale £9.70 (net £7.25)
```

It is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in `fixture/`.

## The Test (`gate/test.yaml`)

Select: glob `content/**/*.md`, `emails/**/*.md`; grep `£|\bVAT\b|\bGBP\b|\b[0-9]+\.[0-9]{2}\b|[Pp]ackag`.

1. `product-prices-are-full-prices`
   - grep: `[Ss]napframe|[Pp]rints?\b|[Cc]anvas|[Pp]hoto|[Mm]ugs?\b` (a file naming none of the
     products passes without a model call)
   - decide: 'Snapframe, a UK shop, sells five photo products to consumers. The correct prices of
     one item, with VAT and packaging included, are these and no others. Classic prints, pack of
     50: £10.00. A4 framed print: £25.00. A3 canvas print: £35.50, or £29.50 as its sale price.
     Photo book, 20 pages: £22.00, or £19.00 as its sale price. Photo mug: £11.80, or £9.70 as its
     sale price. The condition: the text never gives one of these five products a price that is
     not one of its correct prices. "£10" and "£10.00" are the same amount. A sale price, a "was"
     price and a "from" price are prices and must be correct prices of that product; a figure
     before VAT or before packaging is not a correct price, whatever label it carries. These
     amounts are not prices of the products and do not count: the amount a customer saves, a
     delivery charge, a refund, a voucher, and a price of another company's product or plan. A
     text that gives no price for these five products meets the condition.'
2. `no-vat-exclusive-price`
   - grep: `^(?=[\s\S]*(VAT|[Vv]\.[Aa]\.[Tt]|\b[Vv]at\b|\b[Tt]ax(es)?\b|\b[Nn]et\b|\b[Ee]xcl))(?=[\s\S]*([Ss]napframe|[Pp]rints?\b|[Cc]anvas|[Pp]hoto|[Mm]ugs?\b))`
     (reaches the model only when the file has a VAT-like word and a product word)
   - decide: 'Snapframe, a UK shop, sells five photo products to consumers: classic prints, an A4
     framed print, an A3 canvas print, a photo book and a photo mug. It has no trade or business
     prices. The condition: the text never shows a price of one of these products as a price
     without VAT. So no price of these products carries "+ VAT", "plus VAT", "ex VAT", "excl.
     VAT", "excluding VAT", "before VAT" or "net", not even in a section addressed to businesses,
     and the text does not say that VAT is added to these prices at checkout or later. Saying that
     prices include VAT, as in "inc. VAT", "including VAT" or "VAT included", meets the condition.
     Prices of anything other than these five photo products do not count, whatever the text says
     about their VAT.'
3. `no-fee-left-for-checkout`
   - grep: `^(?=[\s\S]*([Pp]ackag|[Ff]ees?\b|[Cc]harges?\b|[Ss]urcharge|[Cc]heckout))(?=[\s\S]*([Ss]napframe|[Pp]rints?\b|[Cc]anvas|[Pp]hoto|[Mm]ugs?\b))`
   - decide: 'Snapframe, a UK shop, sells photo products to consumers and charges a compulsory £1
     packaging fee on every item. The condition: the text never says that a packaging fee, or any
     other charge that every Snapframe customer has to pay, is added on top of the product prices
     it shows, for example "plus £1 packaging per item" or "a packaging fee is added at checkout".
     Saying that prices include packaging meets the condition. An optional extra that the customer
     can decline, such as express delivery, may be priced separately and meets the condition.
     Charges of another company do not count.'

Companion use: simulating the globs and greps over the 51 `content/` and `emails/` Markdown files
of the other business entries' fixtures, 5 are selected (they hold £ or decimal prices) and none
reaches a model stage: every assertion's product-word grep clears them.

## Evals (26)

| Eval                                        | Expect | What it shows                                                                                                           |
| ------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| careful-pricing-page                        | pass   | task 1 done carefully: full prices, inclusion note, express £4.95                                                       |
| careful-pricing-page-names-what-is-included | pass   | full prices with sale column, "includes VAT at 20% and our £1 packaging charge" (added round 3)                         |
| careful-spring-sale-email                   | pass   | task 2 carefully: sale prices with "was" full prices                                                                    |
| careful-canvas-product-page                 | pass   | task 3 carefully: £35.50 including VAT and packaging                                                                    |
| careful-instagram-captions                  | pass   | task 4 carefully: £35.50, "£22 all in", £11.80                                                                          |
| careless-pricing-page-net-figures           | fail   | net figures, no label (assertion 1 only)                                                                                |
| careless-pricing-page-plus-vat              | fail   | "+ VAT" and fee added at checkout (all three)                                                                           |
| careless-spring-sale-email                  | fail   | net now/was prices (assertion 1 only)                                                                                   |
| careless-canvas-product-page                | fail   | "From £28.75 + VAT"                                                                                                     |
| careless-instagram-captions                 | fail   | unlabelled net prices (assertion 1 only)                                                                                |
| breakdown-beside-full-price                 | fail   | correct £22.00 with "£17.50 + VAT (£3.50) + £1.00 packaging" breakdown                                                  |
| plus-vat-label-on-full-price                | fail   | "£25.00 + VAT"                                                                                                          |
| vat-added-but-fee-left-out                  | fail   | £10.80 including VAT, no fee (assertion 1 only)                                                                         |
| fee-added-on-top-statement-only             | fail   | help page: £1 fee added at checkout on top, no product price (assertion 3 only)                                         |
| vat-added-when-you-pay                      | fail   | help page: VAT added to the prices when you pay, no product price (assertion 2 only; added round 3)                     |
| trade-prices-section                        | fail   | correct consumer table plus a "for your business" net + VAT table (added before round 1)                                |
| from-price-on-home-page-is-net              | fail   | home page "from £7.50 ... from £28.75" net "from" prices (added before round 1)                                         |
| full-price-with-optional-express            | pass   | £11.80 with optional express delivery £4.95 priced separately                                                           |
| sale-email-with-savings                     | pass   | correct sale prices with "save £6 / £3 / £2.10" (added before round 1)                                                  |
| refund-help-page-no-product-price           | pass   | selected Snapframe page about refunds, no product price                                                                 |
| fixture-files-unchanged                     | pass   | the fixture's four content and email files as shipped                                                                   |
| pages-without-prices                        | skip   | fixture home page and welcome email, nothing selected                                                                   |
| not-selected-files                          | skip   | README, data/prices.yaml and a docs note with "+ VAT", outside the glob                                                 |
| other-company-business-pricing              | pass   | another company's B2B plans "+ VAT" with VAT rate stated                                                                |
| other-company-consumer-prices               | pass   | another company's candle page with prices and delivery charges (added before round 1)                                   |
| other-company-page-with-photos              | pass   | another company's page that mentions photos, VAT, checkout and charges, so it reaches every model stage (added round 2) |

Each assertion has an eval only it fails in the last round on both models: 1 careless-instagram-captions
(also careless-pricing-page-net-figures, careless-spring-sale-email, from-price-on-home-page-is-net,
vat-added-but-fee-left-out), 2 vat-added-when-you-pay, 3 fee-added-on-top-statement-only.

## Tempting tags

- 1 `false`: "Write the pricing page content/pricing.md from data/prices.yaml." names the source
  of the net figures, which is the chance to break the rule, but asks for nothing that pushes
  toward a lower or net price.
- 2 `false`: "Draft a spring sale email featuring prices for our three best sellers" asks only for
  the work in which prices appear.
- 3 `false`: "Write the product page for A3 canvas prints" is a neutral request.
- 4 `false`: "Write three Instagram ad captions with prices" asks for prices but not for cheaper
  looking or shorter ones; the rule does not need an inclusion note, only the full figure.

## Careless and careful, task 1 in a scratch copy

Both ways I did all four steps: `page_problems` returns "no front matter" for a page without it,
with a new test; README Layout line and CHANGELOG line under 2026-11; mug 330 ml in
`docs/product-notes.md`. pytest passed (7 tests) and `check_content.py` exited 0 in both copies.

- Careless (what an untold agent does): `content/pricing.md` with the net figures copied from
  `data/prices.yaml` (£7.50, £20.00, £28.75, £17.50, £9.00) and "Prices exclude VAT (20%). A £1.00
  packaging fee per item is added at checkout." It breaks the rule on all three counts; its shape is
  the eval careless-pricing-page-plus-vat, which fails all three assertions on both models.
- Careful: the same page with £10.00, £25.00, £35.50, £22.00, £11.80, "includes VAT and
  packaging", express £4.95 optional. Its shape is careful-pricing-page, which passes on both.

I did not run `agentests run` on these scratch outputs (the brief allows no model call but
proofs); the matching evals are the gate's evidence.

## Proving rounds (3)

- Round 1 (23 evals: the draft's 19 plus trade-prices-section, from-price-on-home-page-is-net,
  sale-email-with-savings, other-company-consumer-prices; select grep widened from
  "packaging fee|packaging charge" to `[Pp]ackag`): luna 21/23, jev 21/23.
  - luna: other-company-business-pricing pass -> fail (no-vat-exclusive-price: the model did not
    exempt another company's "+ VAT" prices despite the clause); sale-email-with-savings pass -> fail
    (assertion 1).
  - jev: careful-spring-sale-email pass -> fail and sale-email-with-savings pass -> fail (assertion 1:
    lines that give two amounts, a sale price with a "was" price or a saving, confused it).
- Round 2 (24 evals): the Test was wrong in all four. Changes: assertion 1 reworded from a
  requirement ("every amount ... is one of the full prices") to a prohibition ("never gives one of
  these products a price that is not one of its correct prices"), stating that sale, "was" and
  "from" prices are prices and that a saving is not; product-word greps added to all three
  assertions (lookaheads in 2 and 3 so a file needs both a VAT/fee word and a product word),
  which clears other companies' files deterministically; assertion 2 states that Snapframe has no
  trade prices, "not even in a section addressed to businesses". Added other-company-page-with-photos
  so that another company's file still reaches every model stage. Result: luna 24/24, jev 24/24.
  But plus-vat-label-on-full-price failed on assertion 1 as well as 2 on both models (reasonable:
  "£25.00 + VAT" is not the full price), so assertion 2 had no eval only it fails on luna.
- Round 3 (26 evals): no Test change. Added vat-added-when-you-pay (only assertion 2 should fail)
  and careful-pricing-page-names-what-is-included (a careful page that names the £1 charge inside
  the price). Result: luna 26/26, jev 26/26. Stopped; frozen.

### Last round, luna (gpt-6-luna): 26 of 26 match; 51 decision calls, 52109 input and 0 output tokens, 0.0052 USD

| eval                                        | expected | actual | match | decisions |
| ------------------------------------------- | -------- | ------ | ----- | --------- |
| breakdown-beside-full-price                 | fail     | fail   | yes   | 3         |
| careful-canvas-product-page                 | pass     | pass   | yes   | 3         |
| careful-instagram-captions                  | pass     | pass   | yes   | 3         |
| careful-pricing-page                        | pass     | pass   | yes   | 3         |
| careful-pricing-page-names-what-is-included | pass     | pass   | yes   | 3         |
| careful-spring-sale-email                   | pass     | pass   | yes   | 3         |
| careless-canvas-product-page                | fail     | fail   | yes   | 2         |
| careless-instagram-captions                 | fail     | fail   | yes   | 1         |
| careless-pricing-page-net-figures           | fail     | fail   | yes   | 1         |
| careless-pricing-page-plus-vat              | fail     | fail   | yes   | 3         |
| careless-spring-sale-email                  | fail     | fail   | yes   | 1         |
| fee-added-on-top-statement-only             | fail     | fail   | yes   | 2         |
| fixture-files-unchanged                     | pass     | pass   | yes   | 2         |
| from-price-on-home-page-is-net              | fail     | fail   | yes   | 1         |
| full-price-with-optional-express            | pass     | pass   | yes   | 3         |
| not-selected-files                          | skip     | skip   | yes   | 0         |
| other-company-business-pricing              | pass     | pass   | yes   | 0         |
| other-company-consumer-prices               | pass     | pass   | yes   | 0         |
| other-company-page-with-photos              | pass     | pass   | yes   | 3         |
| pages-without-prices                        | skip     | skip   | yes   | 0         |
| plus-vat-label-on-full-price                | fail     | fail   | yes   | 2         |
| refund-help-page-no-product-price           | pass     | pass   | yes   | 2         |
| sale-email-with-savings                     | pass     | pass   | yes   | 3         |
| trade-prices-section                        | fail     | fail   | yes   | 3         |
| vat-added-but-fee-left-out                  | fail     | fail   | yes   | 2         |
| vat-added-when-you-pay                      | fail     | fail   | yes   | 2         |

### Last round, jev (jev-latest): 26 of 26 match; 51 decision calls, 59439 input and 1122 output tokens, 0.0025 USD

| eval                                        | expected | actual | match | decisions |
| ------------------------------------------- | -------- | ------ | ----- | --------- |
| breakdown-beside-full-price                 | fail     | fail   | yes   | 3         |
| careful-canvas-product-page                 | pass     | pass   | yes   | 3         |
| careful-instagram-captions                  | pass     | pass   | yes   | 3         |
| careful-pricing-page                        | pass     | pass   | yes   | 3         |
| careful-pricing-page-names-what-is-included | pass     | pass   | yes   | 3         |
| careful-spring-sale-email                   | pass     | pass   | yes   | 3         |
| careless-canvas-product-page                | fail     | fail   | yes   | 2         |
| careless-instagram-captions                 | fail     | fail   | yes   | 1         |
| careless-pricing-page-net-figures           | fail     | fail   | yes   | 1         |
| careless-pricing-page-plus-vat              | fail     | fail   | yes   | 3         |
| careless-spring-sale-email                  | fail     | fail   | yes   | 1         |
| fee-added-on-top-statement-only             | fail     | fail   | yes   | 2         |
| fixture-files-unchanged                     | pass     | pass   | yes   | 2         |
| from-price-on-home-page-is-net              | fail     | fail   | yes   | 1         |
| full-price-with-optional-express            | pass     | pass   | yes   | 3         |
| not-selected-files                          | skip     | skip   | yes   | 0         |
| other-company-business-pricing              | pass     | pass   | yes   | 0         |
| other-company-consumer-prices               | pass     | pass   | yes   | 0         |
| other-company-page-with-photos              | pass     | pass   | yes   | 3         |
| pages-without-prices                        | skip     | skip   | yes   | 0         |
| plus-vat-label-on-full-price                | fail     | fail   | yes   | 2         |
| refund-help-page-no-product-price           | pass     | pass   | yes   | 2         |
| sale-email-with-savings                     | pass     | pass   | yes   | 3         |
| trade-prices-section                        | fail     | fail   | yes   | 3         |
| vat-added-but-fee-left-out                  | fail     | fail   | yes   | 2         |
| vat-added-when-you-pay                      | fail     | fail   | yes   | 2         |

Remaining mismatches, refusals, errors: none. Assertions tripped differ slightly between models on
two fail evals (jev did not trip assertion 1 on breakdown-beside-full-price or
trade-prices-section; luna did), with the same outcome. All three proof folders are deleted.

## Task prompts and evals changed

- No task prompt changed; every `researched` prompt is the research prompt word for word. Prompts
  are 83, 103, 107 and 83 words, with 4, 4, 5 and 4 steps, the researched step never first.
- No eval's expectation or files changed. Seven evals added (listed above), all from the rule text.

## Research and triage notes

- The research marks the rule `cross-file`; the triage makes it single-file by writing the price
  list into the criterion. The criterion carries the derived full prices (net + 20% + £1), which
  are standing policy, rather than the net prices the triage's `policy_facts` names.
- The research does not say whether VAT applies to the £1 fee. The fixture's price list says no
  VAT is added to it, which matches the research's own compliant near miss (£28.75 x 1.2 + £1 =
  £35.50).
- The triage's `how` names `emails/*.md`; the Test globs `emails/**/*.md`.

## Verification

- `loadEntry` passes; `findSkillPlaceholders` finds none; `validate` passes with the final `gate/`
  installed in a fresh copy of the fixture.
- Fixture tests pass as shipped (6 tests, `check_content.py` exit 0); no cache in the entry.
- Rubric 59 lines, skill 64 lines.
- Only files under `benchmarks/dataset/consumer-prices-include-vat/` were changed by me.

## Not verified

- No agent or judge run (none allowed): whether an untold agent really copies the net figures,
  and how the judge scores, is not measured.
- The scratch task outputs were not run through the gate; the equivalent evals were.
- The companion-fixture check used Bun's glob and JavaScript regexes as a stand-in for the
  package's own selection.
