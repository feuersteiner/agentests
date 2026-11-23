# Rubric: new tests catch new regressions

## The rule

Each new test must catch a realistic regression that no existing test already catches and must assert observable behaviour through the public interface; variations of an existing case extend that test or become parameters instead of near-duplicate tests.

- The public interface is `pricing.discounts.apply_discounts(cart, coupon_pct=None, loyalty_pct=None)`: the quote it returns and the errors it raises. Names that start with an underscore, such as `_round_money`, are private.
- The existing suite in `tests/test_discounts.py` already covers a cart with no discount or a single percentage discount, a fixed voucher, and rounding half up to the cent.

## What to look at

Read every test the diff adds or changes, in any file, and ask of each:

1. **Which regression does it catch?** Name a realistic bug in `apply_discounts` that would make it
   fail: the loyalty discount taken off the subtotal instead of what the coupon left, the voucher
   applied before the percentages, rounding half to even, a range check dropped, a total below
   zero. A test for which no such bug can be named is trivial (it checks that a dataclass stores
   its fields, that the result is a `Quote`, or a value the test set itself).
2. **Is that regression already caught?** By an existing case listed in the rule, or by another
   test in the diff. Re-testing a single coupon, a single loyalty discount, no discount, a voucher
   or plain rounding on its own repeats the existing suite.
3. **Does it go through the public interface?** It calls `apply_discounts` and asserts on the
   quote's amounts or on the error raised. Calling an underscore name, mocking, patching or spying
   on pricing code, or asserting how the result was computed breaks the rule.
4. **Are variations folded in?** Several functions that differ only in their numbers, or that
   repeat the same call to assert another field, should be parameters of one test or extra
   assertions in it. Adding a case to an existing parametrized test is the compliant way to extend.

Then check the task itself: the requested tests exist and fit the request, and when the task asks
for a fix, the diff changes `apply_discounts` so the reported behaviour is correct and a test
covers it. Do not reward the number of tests: one well-parametrized test can earn a 10. Ignore
style, naming and formatting except where they hide a duplicate.

## Scores

- **0**: no commit, or the diff adds no tests and does not attempt the task.
- **1 to 3**: the task is attempted, but the rule is clearly broken: most new tests are trivial,
  private-helper or mock-call tests, restate existing cases, or are near-duplicates of each other.
- **4 to 6**: some new tests catch distinct regressions through `apply_discounts`, mixed with
  several that are trivial, duplicated or about internals.
- **7 to 9**: the task is done and the rule is followed, with one redundant or trivial test, or
  the task is only partly done (for example a fix without a test that covers it).
- **10**: the task is fully done and every new test catches a distinct, nameable regression
  through `apply_discounts`, with variations as parameters or in existing tests.

What each looks like:

- **2**: a block of test functions, one per input combination, each repeating the same call with
  new numbers; a test that calls a private helper such as `_round_money`; a test that spies on a
  helper to check it was called; and re-tests of a coupon alone and a voucher alone. At most one test would catch a
  bug the suite does not already catch.
- **5**: one good parametrized test of the new behaviour, plus separate near-duplicate functions
  for zero or full percentages, a re-test of a single discount, or one private-helper test.
- **8**: every new test catches a distinct regression through `apply_discounts` and variations
  are parameters, but one case repeats an existing one or one test is trivial.
- **10**: for example, one parametrized test whose cases each name a different failure (the order
  in which discounts stack, the voucher after both percentages), plus a separate test only for a
  different behaviour such as a rejected percentage; nothing repeats the existing suite, and any
  requested fix is made and covered.
