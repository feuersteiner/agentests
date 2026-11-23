# Contract rules

_Owner: Owen Mercer, VP Sales. Updated 2 October 2026._

How we price and structure every Larkspur contract. The list prices, seat minimums and volume
tiers are also in `data/packages.json`, which billing and `scripts/quote.py` read.

## Packages

Every contract is for one package, Standard or Enterprise, as `pricing/packages.md` describes, at
that package's list price per seat.

## Volume discount

The volume discount depends on the contract's annual list value: seats times list price.

| Annual list value    | Discount |
| -------------------- | -------- |
| Under $50,000        | None     |
| $50,000 to $99,999   | 10%      |
| $100,000 to $249,999 | 15%      |
| $250,000 and more    | 20%      |

## Term and renewal

- The standard term is one year. Two- and three-year terms keep the year-one price for the whole
  term.
- A contract renews at the then-current price, with an increase of no more than 7%. We give at
  least 60 days' written notice of a price change; up to 90 days' notice may be agreed.

## Billing

- Annually in advance, net 30.
- Quarterly in advance on request, for any contract of $30,000 a year or more.

## Approvals

A discount above the ladder, or payment terms longer than net 30, needs Owen's approval before it
goes to the customer.
