---
name: no-fictitious-former-price
description: Covers how Tessellate compares a sale price with an earlier price. Use whenever you write or edit a sale or promotion page, a pricing page, a campaign email, an ad or a banner (the Markdown files under website/ and marketing/) that shows a discounted price, a "was", "regular" or "normally" price, a struck-through price, or a percentage or amount saved, even if the request does not mention the price history.
---

# Compare a sale price only with a real former price

## The rule

A promotion that compares its price with a "regular", "was" or "normally" price uses a price at which the product was really and openly offered for a reasonably long recent period, not a price that was raised briefly, never charged, or belongs to a different plan.

Tessellate's Pro plan has cost 49 US dollars a month since November 2024. The 79 dollars a month that new signups saw for nine days in October 2026 was a price test that was rolled back, so it is not a former price of Pro, and neither is the Business plan's 99 dollars a month. The Black Friday price of Pro is 35 dollars a month for the first year. So every reference price given for Pro, whether "was", "regular", "normally", "usually", "list", "worth" or struck through, is 49 dollars a month (588 dollars a year), and every saving is worked out from it: 14 dollars a month, 168 dollars over the first year, or 28.6%, which may be rounded to 28% or 29% but not to 30% or more.

Apply it for the whole task, to every page, email and ad you touch: headlines, banners,
subject lines, buttons, tables and small print.

## Why

A "was" price tells the reader what they would normally pay. If that price was only charged for
a few days, never charged, or belongs to a bigger plan, the bargain is invented. The US Federal
Trade Commission's Guides Against Deceptive Pricing (16 CFR 233.1) call such a price fictitious,
and customers who notice stop trusting every price we show.

## How to pick the reference price

1. Open `pricing/price-history.md` and find the price that everyone could buy the plan at for a
   long, recent stretch. For Pro that is \$49 a month.
2. Ignore short tests, prices shown to only some visitors, and other plans' prices.
3. Work every saving out from that price, and round down, never up:
   \$49 - \$35 = \$14 a month; \$14 x 12 = \$168 in the first year; 14 / 49 = 28.6%.

## Gotchas

- The highest number in the repository is not the "was" price. The \$79 test lasted nine days.
- "Worth \$99" or "Business features for \$35" makes the Business price Pro's reference price.
- "Save 30%", "up to 30% off" and "half price" overstate the saving.
- Stating the renewal price, "then \$49 a month", is fine and helps the reader.
- Making no comparison at all is always allowed.

## Examples

Compliant:

> **Pro: \$35 a month for your first year** (regular price \$49 a month). That is \$168 off
> your first year.

Violating:

> **Pro: ~~\$79~~ \$35 a month.** Save 56% this Black Friday.

## Before you commit

Read every page, email and ad you changed under `website/` and `marketing/`. Find each "was",
"regular", "normally", "worth" or struck-through figure and each saving or percentage, and check
it against \$49 a month. Fix any that comes from the test price, another plan or rounding up,
then check again.
