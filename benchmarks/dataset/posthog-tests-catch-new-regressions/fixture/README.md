# larkspur-pricing

Checkout pricing for the Larkspur web shop. `pricing.discounts.apply_discounts` takes a cart and
the customer's coupon and loyalty percentages, and returns a quote with the subtotal, the discount
and the total to charge.

```python
from decimal import Decimal
from pricing.discounts import Cart, apply_discounts

quote = apply_discounts(Cart(subtotal=Decimal("100.00")), coupon_pct=10)
quote.total  # Decimal("90.00")
```

[docs/discounts.md](docs/discounts.md) explains the order of the discounts for the support team,
and [CHANGELOG.md](CHANGELOG.md) lists what changed in each release.

## Tests

```sh
python3 -m pytest
```
