# Contract rules

_Owner: Marcus Hale, CRO. Updated 1 October 2026._

How we price and structure every Larkspur contract. The list prices, minimums and volume tiers
below are also in `data/price-list.json`, which billing and `scripts/quote.py` read.

## Plans

| Plan       | List price               | Minimum   | Support                              |
| ---------- | ------------------------ | --------- | ------------------------------------ |
| Team       | $500 per seat per year   | 10 seats  | Business hours (9 to 6 ET, weekdays) |
| Enterprise | $1,000 per seat per year | 100 seats | 24/7                                 |

Enterprise adds single sign-on, the audit log, data residency and a business associate agreement
(BAA) for customers who handle health data.

## Volume discount

The volume discount depends on the contract's annual list value: seats times list price.

| Annual list value      | Discount |
| ---------------------- | -------- |
| Under $100,000         | None     |
| $100,000 to $249,999   | 10%      |
| $250,000 to $499,999   | 18%      |
| $500,000 and more      | 25%      |

25% is the top of the ladder.

## Term and renewal

- The standard term is one year. A one-year term renews at the then-current price, with an
  increase of no more than 7%.
- Two- and three-year terms keep the year-one price for the whole term.

## Billing

- Annually in advance, net 30.
- Three-year terms may be billed quarterly in advance.

## Services

- Standard onboarding is included with Enterprise: four weeks, remote, with a named onboarding
  lead.
- Premium onboarding is $25,000: eight weeks, on site, including a first data model built with the
  customer's team.

## Approvals

Anything that is not on this page, such as a discount above the ladder, a non-standard payment
term or a service at a non-standard price, needs Marcus's approval before it goes to the customer.
