---
name: posthog-tests-catch-new-regressions
description: Use whenever you write, add, extend or change tests in this repository, including requests to add tests for a module, write tests for a new feature, increase test coverage, or fix a bug and add a regression test, even if the request does not mention test quality. Covers which tests are worth adding, testing through apply_discounts rather than private helpers or mocks, and folding variations into parameters instead of near-duplicate tests.
---

# New tests catch new regressions

## The rule

Each new test must catch a realistic regression that no existing test already catches and must assert observable behaviour through the public interface; variations of an existing case extend that test or become parameters instead of near-duplicate tests.

- The public interface is `pricing.discounts.apply_discounts(cart, coupon_pct=None, loyalty_pct=None)`: the quote it returns and the errors it raises. Names that start with an underscore, such as `_round_money`, are private.
- The existing suite in `tests/test_discounts.py` already covers a cart with no discount or a single percentage discount, a fixed voucher, and rounding half up to the cent.

## Why

A test earns its place by failing for a bug that nothing else would catch. A test that repeats an
existing case adds run time and maintenance and no protection. A test that pins a private helper or
checks that a mock was called breaks on harmless refactors and still passes when the behaviour a
customer sees is wrong. A pile of near-identical functions looks thorough but hides what is
actually covered; one parametrized test shows every case at a glance.

## How to apply it

For every test you are about to write:

1. Read the existing tests for the code first.
2. Name the regression in one sentence: "this fails if ...". If you cannot name a realistic bug,
   or an existing test already fails for that bug, do not add the test.
3. Call the public function and assert on what it returns or raises, never on how it got there.
4. If the new case differs from an existing test only in its inputs or expected values, add it as
   a parameter of that test (or an extra assertion in it) instead of writing a new function.
5. Prefer the case that sits on a boundary or distinguishes two plausible implementations over
   another "typical" value.

Common slips: a test per input combination; separate tests for "only A" and "only B" when the
suite already covers them; asserting a dataclass stores its arguments or that a result has the
right type; calling an underscore helper directly; spying on a helper to see that it was called.

## Example

The function under test is `shipping_fee(weight_kg)`, with a private helper `_band(weight_kg)`.

Violating: three tests where one would do, a private helper and a mock call.

```python
def test_fee_for_one_kg():
    assert shipping_fee(Decimal("1")) == Decimal("4.90")

def test_fee_for_two_kg():
    assert shipping_fee(Decimal("2")) == Decimal("4.90")

def test_band_for_light_parcel():
    assert shipping._band(Decimal("0.5")) == "small"

def test_fee_looks_up_band(mocker):
    spy = mocker.spy(shipping, "_band")
    shipping_fee(Decimal("1"))
    spy.assert_called_once()
```

Compliant: one test, each case guarding a different mistake at the band edge.

```python
@pytest.mark.parametrize(
    "weight_kg, fee",
    [
        ("2.00", "4.90"),  # fails if the small band stops below 2 kg
        ("2.01", "7.50"),  # fails if a parcel just over 2 kg stays in the small band
    ],
)
def test_fee_steps_up_at_the_band_edge(weight_kg, fee):
    assert shipping_fee(Decimal(weight_kg)) == Decimal(fee)
```

## Before you commit

Review every test in the staged diff. For each one, say which regression it catches and confirm no
other test catches it; confirm it calls only the public interface and asserts on the result or the
error; and merge any functions that differ only in their values into parameters. Fix what fails
and review again before you commit.
