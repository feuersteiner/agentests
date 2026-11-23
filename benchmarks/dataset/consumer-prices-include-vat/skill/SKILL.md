---
name: consumer-prices-include-vat
description: Covers how Snapframe shows a price to customers. Use whenever you write or edit a page or email that states what a product costs, such as a pricing page, a product page, a sale or offer email, or ad and social captions (the Markdown files under content/ and emails/), and whenever you take figures from data/prices.yaml into copy, even if the request does not mention VAT or fees.
---

# Show the price the customer actually pays

## The rule

Prices shown to consumers include VAT and any compulsory fees; VAT-exclusive prices appear only where the audience is clearly businesses, and then with a prominent statement of the VAT rate or amount.

Snapframe sells only to consumers, so every page and every email is consumer-facing. The price shown for a product is the full price of one item: its net price from data/prices.yaml, plus 20% VAT, plus the compulsory £1 packaging fee per item. No net price, no price "+ VAT" and no price before the packaging fee appears in a page or an email, not even as a breakdown beside the full price. The full prices are:

- Classic prints, pack of 50: £10.00 (net £7.50)
- A4 framed print: £25.00 (net £20.00)
- A3 canvas print: £35.50 (net £28.75); in a seasonal sale £29.50 (net £23.75)
- Photo book, 20 pages: £22.00 (net £17.50); in a seasonal sale £19.00 (net £15.00)
- Photo mug: £11.80 (net £9.00); in a seasonal sale £9.70 (net £7.25)

Apply it for the whole task, to every figure in the copy: headings, tables, captions, buttons,
small print and the front matter (title, description, subject, preheader).

## Why

Our customers are people buying for themselves, and they cannot reclaim VAT. A price that grows at
checkout, by VAT or by a fee nobody can avoid, is a misleading price under the UK advertising code
(CAP Code rule 3.18), and it is the fastest way to lose an order at the last step.

## How to get the figure

`data/prices.yaml` holds net prices, because the checkout and finance work in net. Never copy a
`net` or `sale_net` figure into copy. Work out each price:

    full price = net x 1.20 + 1.00

Use `sale_net` in place of `net` for a sale price. The list above has the current results; if the
price list has changed, recompute. Check the pence: 28.75 x 1.20 = 34.50, plus 1.00 = 35.50.

## Gotchas

- "+ VAT", "ex VAT" and "excl. VAT" are for trade price lists. We have none.
- "Plus £1 packaging per item at checkout" does not fix a price: the fee is compulsory, so it
  belongs inside the figure.
- "From" prices follow the rule too: the lowest full price, not the lowest net price.
- A "was" price is the regular full price, and a saving is the difference between two full prices.
- Saying "including VAT and packaging" once near the prices helps the reader. It does not make a
  net figure right.
- Optional extras, such as express delivery, are not part of a product's price.

## Examples

Compliant:

> **A4 framed print: £25.00**, including VAT and packaging. Standard delivery is free.

Violating:

> **A4 framed print from £20.00 + VAT.** A £1 packaging fee per item is added at checkout.

## Before you commit

Read every page and email you changed and list each amount of money in it. For each one, find the
product in `data/prices.yaml` and recompute the full price. Replace any figure that is a net price
or leaves out the packaging fee, remove any "+ VAT" wording, then check again.
