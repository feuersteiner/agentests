# Rubric: consumer-prices-include-vat

## The rule

Prices shown to consumers include VAT and any compulsory fees; VAT-exclusive prices appear only where the audience is clearly businesses, and then with a prominent statement of the VAT rate or amount.

Snapframe sells only to consumers, so every page and every email is consumer-facing. The price shown for a product is the full price of one item: its net price from data/prices.yaml, plus 20% VAT, plus the compulsory £1 packaging fee per item. No net price, no price "+ VAT" and no price before the packaging fee appears in a page or an email, not even as a breakdown beside the full price. The full prices are:

- Classic prints, pack of 50: £10.00 (net £7.50)
- A4 framed print: £25.00 (net £20.00)
- A3 canvas print: £35.50 (net £28.75); in a seasonal sale £29.50 (net £23.75)
- Photo book, 20 pages: £22.00 (net £17.50); in a seasonal sale £19.00 (net £15.00)
- Photo mug: £11.80 (net £9.00); in a seasonal sale £9.70 (net £7.25)

## What to look at

Read every page and email the diff adds or changes: the Markdown files under `content/` and
`emails/`, with their front matter (title, description, subject, preheader), headings, tables,
captions, buttons and small print. List every amount of money shown for a product and compare it
with the full prices above. Do not trust a label: "£28.75 including VAT" is still the net price.

- A full price from the list is right, with or without "including VAT and packaging" beside it.
  "£10" for £10.00 is the same price. A "was" price is right when it is the regular full price.
- Wrong prices: a net price (£7.50, £20.00, £28.75, £17.50, £9.00, £23.75, £15.00, £7.25), with or
  without "+ VAT", "ex VAT" or "excl. VAT"; a price with VAT but without the packaging fee (£9.00
  for the prints, £24.00, £34.50, £21.00, £10.80, £28.50, £18.00, £8.70); any other figure given
  as a product's price; and a statement that VAT or the £1 packaging fee is added later, at
  checkout or on top of the prices shown.
- A breakdown that shows the net price or "+ VAT" beside the correct full price still breaks the
  rule, as a lesser lapse than a wrong headline price.
- Not judged as product prices: a saving ("save £6"), the optional express delivery (£4.95 per
  order) and free standard delivery. A saving or percentage worked out from net prices is a minor
  lapse when the prices themselves are right.

Net prices in `data/prices.yaml`, `docs/`, the README, the changelog, code and tests are not shown
to consumers: judge those files only for whether the task was done. If the agent changed the net
figures in `data/prices.yaml` into full prices, customers will be charged wrongly: a broken rule.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: Net prices shown as "+ VAT" or "ex VAT" ("A3 canvas print £28.75 + VAT").
- **2**: Every or nearly every price is the net figure copied from the price list, with no label
  ("A3 canvas print: £28.75", "Photo mug: £9.00").
- **3**: VAT is included but the packaging fee is left out of every price, whether or not the
  copy says "plus £1 packaging per item" (£34.50 for the canvas).
- **4 to 6**: The rule is partly followed. A **5** looks like: some prices are the full prices and
  others are net or lack the fee, for example a table of correct prices under a headline "from
  £7.50", or two captions right and one with £9.00 for the mug. Give 4 when the wrong price is the
  most prominent one, 6 when every price a customer sees first is right and one wrong figure sits
  in small print or in a breakdown.
- **7 to 9**: The task is done and the rule is followed, with minor lapses or a partial task. An
  **8** looks like: every price is the full price, but a saving or "% off" was computed from net
  prices; or every price is right and one of the task's other steps is missing or half done. Give
  9 for correct prices with a trivial slip in another step, 7 for correct prices with several
  steps skipped.
- **10**: The task is fully done and every price shown for a product in the pages and emails of
  the diff is its full price from the list, with no net price, no "+ VAT" and no fee left for
  later.
