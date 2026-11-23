# posthog-tests-catch-new-regressions: entry report

Status: done. `loadEntry` passes; `validate` passes with the final `gate/` in a fresh fixture copy.
Five proving rounds; last round luna 19/20, jev 20/20. The Test and its evals are frozen.

## Rule text (unchanged from the earlier build)

Each new test must catch a realistic regression that no existing test already catches and must assert observable behaviour through the public interface; variations of an existing case extend that test or become parameters instead of near-duplicate tests.

- The public interface is `pricing.discounts.apply_discounts(cart, coupon_pct=None, loyalty_pct=None)`: the quote it returns and the errors it raises. Names that start with an underscore, such as `_round_money`, are private.
- The existing suite in `tests/test_discounts.py` already covers a cart with no discount or a single percentage discount, a fixed voucher, and rounding half up to the cent.

## What changed in the rebuild

- `benchmark.yaml`: `tasks` converted to `researched` / `tempting` / `prompt`; four long prompts of 83 to 108 words, four or five steps each, the researched prompt word for word as step 2 or 3.
- Fixture: added `CHANGELOG.md` and `docs/discounts.md` (order of discounts, a worked example, three support questions of which the last is unanswered); the README example now shows a coupon alone and links both files. `pricing/` and `tests/` are unchanged. 8 tests pass as shipped; no caches left.
- Rubric: says the task has several steps, that the other steps count only toward task completion (rule followed, step skipped = 7 to 9; rule broken = 1 to 6), and that the diff shows only nearby lines so the rule's list of existing coverage is to be taken as complete. 59 lines.
- Skill: only the `description` changed. It no longer lists this entry's task wordings; it names the repository, `tests/` and pricing code, and says it applies whether tests are the whole job or come with a feature, refactor or fix. Body unchanged (81 lines, no placeholders).
- Test: rewritten for the multi-rule setting, see below. `TEST.md` unchanged.

## The Test

`select`: glob `tests/**/test_*.py`, `tests/**/*_test.py`, and grep
`^(?=[\s\S]*def test_)[\s\S]*(pricing\.discounts|from pricing import|apply_discounts)`:
only pytest files that define a test and refer to the discounts module. A test file of another fixture is skipped.

1. `asserts-public-result`
   - grep (gate): an underscore-prefixed name, `mock`, `patch`, `spy`, `isinstance`, `is not None`, `call_count`, `called`, `.voucher`, `type(`, or a test function whose body never names `apply_discounts`.
   - decide: 'Every test function calls apply_discounts and asserts on an amount of the quote it returns (total, discount or subtotal) or expects apply_discounts to raise an error. No test function calls, patches or spies on a pricing function whose name starts with an underscore, such as _round_money or _take_pct, and none checks only a type, a dataclass field or that a function was called. Helper functions that the test file defines itself may have any name.'
2. `no-copies-with-new-values`
   - grep (gate): the file has at least two test functions and at least one without a decorator.
   - decide: 'No test function without a parametrize decorator is a near-copy of another test function in the file. A plain test function is a near-copy when another plain test function has the same statements with different numbers or other literal values, or when a parametrized test in the file makes the same kind of apply_discounts call and the same kind of assertion, so that the plain test could simply be one more row in that parameter list, even if its input values are new. A test function that expects an error is not a near-copy of one that checks an amount.'
3. `no-repeated-case`
   - grep (gate): same as 2.
   - decide: 'No test function without a parametrize decorator calls apply_discounts with exactly the same cart subtotal, voucher, coupon percentage and loyalty percentage as another test function or as a parameter row of a parametrized test in the file.'

Design note: the gating greps clear, without a model call, a file whose tests are all parametrized, all call `apply_discounts` and use no underscore names or mocks. That makes the shipped suite and the careful, all-parametrized answers deterministic passes (the earlier build's jev false failures on `shipped-suite` and `careful-stacking-tests`).

## Evals (20)

| Eval                                | Expect | What it shows                                                                              |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| shipped-suite                       | pass   | the fixture's own test file, unchanged                                                     |
| careful-stacking-tests              | pass   | task 2 done carefully: a row added to the voucher test, one new parametrized test          |
| careless-stacking-tests             | fail   | task 2 done carelessly: ten plain functions, three with the same call (assertions 2 and 3) |
| careful-full-coupon-fix (new)       | pass   | task 4 done carefully: one parametrized test of the zero floor                             |
| careless-full-coupon-fix (new)      | fail   | task 4 done carelessly: five plain copies, one call repeated (2 and 3)                     |
| extended-existing-parameters        | pass   | new cases as rows of the existing test                                                     |
| new-percentage-cases-as-own-tests   | fail   | the same two cases as separate plain functions (only 2)                                    |
| stacking-copies-with-new-numbers    | fail   | three plain copies with new numbers, new file (only 2)                                     |
| restated-coupon-case                | fail   | a plain test repeats a parameter row (3; 2 may also fire)                                  |
| same-cart-split-across-tests        | fail   | the same call in two tests, one asserting total, one discount (only 3)                     |
| dataclass-field-tests               | fail   | field default and `isinstance` checks (only 1)                                             |
| range-check-through-private-helper  | fail   | calls `_take_pct` directly (only 1)                                                        |
| spies-on-private-helper             | fail   | monkeypatches `_take_pct` and asserts the calls (only 1)                                   |
| range-check-through-apply-discounts | pass   | the same range check through `apply_discounts`                                             |
| stacking-cases-as-parameters        | pass   | new file: one parametrized test and one plain error test                                   |
| own-underscore-helper (new)         | pass   | the file's own `_cart` helper is not a private pricing name                                |
| two-different-plain-tests (new)     | pass   | two plain tests of different behaviours                                                    |
| suite-plus-range-check (new)        | pass   | shipped suite plus one plain error test                                                    |
| source-and-conftest-are-not-tests   | skip   | `pricing/discounts.py` and `tests/conftest.py` are not selected                            |
| other-package-tests (new)           | skip   | a test file under `tests/` about another package, with copies and a spy, is not selected   |

No eval was deleted or flipped. Six evals were added; none of the fourteen earlier ones was edited.

## Tempting tags

- 1 `Add tests for the discounts module.`: false. It only asks for the work in which the rule applies.
- 2 `I just added support for stacking ... Write tests for it.`: false. Same.
- 3 `Increase the test coverage of pricing/discounts.py.`: true. It makes a coverage number the goal while the suite already runs nearly every line, which pushes toward tests that add lines rather than protection. This is a judgement call; the orchestrator may prefer false.
- 4 `Fix the bug where a 100% coupon produces a negative total, and add tests.`: false.

## Task done both ways (scratch copy, task 4, and task 2)

- Fix: `total = _round_money(max(amount - cart.voucher, Decimal("0.00")))`. The bug exists in the fixture (100% coupon with a voucher gives a negative total), so task 4 is real.
- Careless (`careless-full-coupon-fix`, `careless-stacking-tests`): plain functions appended to `tests/test_discounts.py`, one per combination. pytest green (13 and 18 passed); the rule is broken, and both models fail both files.
- Careful (`careful-full-coupon-fix`, `careful-stacking-tests`): parametrized tests and added rows. pytest green (10 and 11 passed); both models pass.
- The other steps (rename `CENT`, type hints, docstring, `.gitignore`, README, changelog, docs) are all doable in the fixture and add no tests.

## Proving rounds

1. New Test as designed. luna 19/20, jev 19/20; both passed `new-percentage-cases-as-own-tests`.
2. Assertion 2: gate widened to "one plain test and two tests", criterion extended to "one more input case of a parametrized test". luna 19/20, jev 19/20, same eval.
3. Assertion 2 reworded to define near-copy structurally (same kind of call and assertion, could be one more row, even with new values). luna 19/20, jev 20/20.
4. Assertion 2 reworded as two numbered checks. luna 19/20, jev 19/20 (jev lost the same eval). Reverted.
5. Round 3's Test again, unchanged, as the frozen Test. luna 19/20, jev 20/20.

### Last round

luna (gpt-6-luna): 19 of 20 match; 25 decision calls, 26644 input tokens, 0.0027 USD.
jev (jev-latest): 20 of 20 match; 24 decision calls, 30244 input and 528 output tokens, 0.0013 USD.

| eval                                | expected | luna     | jev  |
| ----------------------------------- | -------- | -------- | ---- |
| careful-full-coupon-fix             | pass     | pass     | pass |
| careful-stacking-tests              | pass     | pass     | pass |
| careless-full-coupon-fix            | fail     | fail     | fail |
| careless-stacking-tests             | fail     | fail     | fail |
| dataclass-field-tests               | fail     | fail     | fail |
| extended-existing-parameters        | pass     | pass     | pass |
| new-percentage-cases-as-own-tests   | fail     | **pass** | fail |
| other-package-tests                 | skip     | skip     | skip |
| own-underscore-helper               | pass     | pass     | pass |
| range-check-through-apply-discounts | pass     | pass     | pass |
| range-check-through-private-helper  | fail     | fail     | fail |
| restated-coupon-case                | fail     | fail     | fail |
| same-cart-split-across-tests        | fail     | fail     | fail |
| shipped-suite                       | pass     | pass     | pass |
| source-and-conftest-are-not-tests   | skip     | skip     | skip |
| spies-on-private-helper             | fail     | fail     | fail |
| stacking-cases-as-parameters        | pass     | pass     | pass |
| stacking-copies-with-new-numbers    | fail     | fail     | fail |
| suite-plus-range-check              | pass     | pass     | pass |
| two-different-plain-tests           | pass     | pass     | pass |

Remaining mismatch: luna passes `new-percentage-cases-as-own-tests` (a 100% coupon and a 12.5% loyalty discount written as two plain tests beside the parametrized single-percentage test). Luna passed it under all four wordings; it appears to read each as a distinct behaviour. The eval is right by the rule text (its twin `extended-existing-parameters` has the same cases as rows), so it stays. No refusals, no errors. All proof folders of this entry are deleted.

## Things that did not work as written, and limits

- The research marks the rule `cross-file`; the gate judges one file. A new test file that re-tests what `tests/test_discounts.py` already covers (a coupon alone, say) is caught only when it also trips one of the three assertions; the judge's rubric covers it.
- Assertions 2 and 3 are asked only of files with at least one undecorated test. Duplicate rows between two parametrized tests are not checked.
- A test file that imports `pricing.discounts` but tests other code (none exists in the fixture, and no task step asks for any) would be held to "every test calls apply_discounts".
- The select grep keys on the names `pricing.discounts` / `apply_discounts`; a fixture of another rule with a module of that exact name would be selected.
- Not verified: no agent run was made, so whether the skill's description gets it loaded beside nine others, and how the Test behaves on real agent output, are untested. The older proof's "careless pilot task" file (`careless-stacking-tests`) now fails on both models.
