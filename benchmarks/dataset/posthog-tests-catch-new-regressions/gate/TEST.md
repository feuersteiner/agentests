# Tests catch new regressions

The pytest files under `tests/` test the pricing package. Every test in them earns its place:

Each new test must catch a realistic regression that no existing test already catches and must assert observable behaviour through the public interface; variations of an existing case extend that test or become parameters instead of near-duplicate tests.

- The public interface is `pricing.discounts.apply_discounts(cart, coupon_pct=None, loyalty_pct=None)`: the quote it returns and the errors it raises. Names that start with an underscore, such as `_round_money`, are private.
- The existing suite in `tests/test_discounts.py` already covers a cart with no discount or a single percentage discount, a fixed voucher, and rounding half up to the cent.

Helpers inside a test file that build carts or other inputs are not tests, and test files may name
their own helpers with a leading underscore.
