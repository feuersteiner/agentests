# How discounts are applied

This page is for the support team. It describes what checkout does, in the order it does it.

## The order

1. The coupon takes its percentage off the cart's subtotal.
2. The loyalty discount takes its percentage off what the coupon left.
3. The gift voucher takes its fixed amount off what is left after both percentages.
4. The total is rounded half up to the cent, once, at the end.

A coupon or loyalty percentage runs from 0 to 100. Checkout refuses any other value.

## Worked example

A 100.00 cart with a 10% coupon and a 5.00 gift voucher:

| Step       | Amount |
| ---------- | -----: |
| Subtotal   | 100.00 |
| 10% coupon |  90.00 |
| Voucher    |  85.00 |
| Total      |  85.00 |

The quote shows a discount of 15.00.

## Questions from support

**Is the rounding done per discount?**
No. Only the total is rounded, so a 0.05 cart with a 50% coupon costs 0.03.

**Does a 0% coupon count as a coupon?**
It changes nothing: the customer pays the full price.

**Can a customer use a gift voucher together with a coupon and the loyalty discount?**
_Not answered yet._
