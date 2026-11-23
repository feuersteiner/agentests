---
name: offer-letter-no-strike-price
description: Covers how offer documents describe share options. Use whenever you write or edit an offer letter, an offer summary, an email or reply to a candidate about their offer or equity, or the offer letter template (the Markdown files in offers/ and people/templates/), especially anything that mentions options, stock, equity, grants or valuation, even if the request does not mention the price.
---

# Offers state the number of options, never their price

An offer letter, offer summary, offer letter template or reply to a candidate may state the number of share options but does not promise a strike price, exercise price or per-share value, because the price is set later from a third-party valuation.
The board sets the exercise price on the grant date from an independent valuation, which changes with the funding cycle. So these documents give no strike or exercise price, no per-share price or value and no money value for the options, not even as an estimate, an illustration, a template field or "at the last valuation", and do not promise that the price will match an earlier grant, funding round or valuation. They may say that the board will set the exercise price at grant from an independent valuation.

Apply this to every offer document you write or change, for the whole task, and check it again
before you commit.

## Why

- We can commit to a number of options, but not to a price: the independent valuation is done
  later, by a third party, and moves with the funding round.
- A figure in an offer reads as a promise. A candidate who was told one price and is granted at
  another feels misled, and the letter can be held against us.
- Candidates ask what their options are worth, and the latest valuation is easy to find, so a
  figure slips in when the aim is to make the offer attractive.

## How to describe equity instead

- State the number of options, the vesting schedule and the plan they are granted under.
- Say when they are granted, and that the board sets the exercise price on the grant date from an
  independent valuation.
- To make the equity attractive, explain what owning part of the company means and how vesting
  works, without a figure.
- In a template, give a field for the number of options, never for a price or a value.

## Gotchas

Each of these gives a price or a value, even when it is hedged:

- "at an exercise price of \$0.88 a share"
- "worth roughly \$9,000 at today's valuation"
- "For illustration only: at our last 409A, your grant would be worth about \$9,000."
- "the same strike price as the engineers who joined this year"
- "Exercise price: {{strike_price}}" or "Estimated value: {{grant_value}}" in a template

## Example

From an offer letter for a product designer.

Compliant:

```markdown
## Equity

You will be granted options over 5,000 shares under our stock option plan, vesting over four years
with a one-year cliff. The board will set the exercise price on the grant date, based on an
independent valuation.
```

Violating:

```markdown
## Equity

You will be granted 5,000 options at our current price of \$0.88 a share, worth about \$4,400 today
and much more after our next round.
```

## Before you commit

Reread every offer document you created or changed. Find each passage about options, shares,
stock, vesting, strike or exercise price and valuation, and remove any price, per-share figure or
money value for the options, then check again.
