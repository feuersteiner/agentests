# Report: rails-deprecate-before-removing

Status: done, with two mismatches left after five proving rounds. Entry at `benchmarks/dataset/rails-deprecate-before-removing/` (dev, `research/dev-conventions.yaml`, verdict `restate-policy`).

This entry was started by an earlier worker that stopped part-way. Its draft had `benchmark.yaml`, `rubric.md`, `skill/SKILL.md` and `fixture/`, an empty `gate/`, and no scratch folder. What I kept, fixed or redid:

- `benchmark.yaml`: kept the tasks and tags. Fixed the last rule bullet, which exempted "a new method, a new option" as additions and so would have let a silent alias pass.
- `rubric.md`: rewritten to stay under 60 lines (the draft had 69) and to carry the new rule text.
- `skill/SKILL.md`: the description no longer echoes task wording ("make it a keyword"), and the rule text is updated.
- `fixture/README.md`: dropped "a few scripts outside this repository", a nudge toward the rule.
- `gate/`: compiled, evals written and proved from scratch.

## Final rule text

```text
Removing, renaming or changing public behaviour goes through a deprecation step; the old name or behaviour keeps working and emits a deprecation warning that names the replacement and the version in which it will be removed.

- The public API of money_fmt 2.x is `MoneyFmt.format(amount, currency)`, with the currency as its second positional argument and the `symbol_first:` option, and `MoneyFmt::Parser#parse_amount`, which returns a Float.
- Deprecation warnings go through `MoneyFmt.deprecator.warn`. The next major version is 3.0, so the version a warning names is 3.0.
- Where something is removed and nothing takes its place, the warning says so in place of naming a replacement.
- Adding to the API, such as a new currency or a new helper method, changes nothing for existing callers and needs no deprecation. A 2.x form left only as an alias or wrapper of a new form that takes over its job is not an addition: it is deprecated and warns.
```

The first sentence is the research rule word for word. The bullets are standing policy: the triage's two `policy_facts` (the 2.x public API, and the deprecator and 3.0), plus two clarifications. One covers a removal with no successor (task 3). The other separates a real addition from an old form left as a silent alias or wrapper.

## Fixture

`money_fmt` 2.3.0, a small Ruby gem of the fictional Larkspur Books payments team: `lib/money_fmt.rb` (`MoneyFmt.format(amount, currency, symbol_first: nil)` and `MoneyFmt::Parser#parse_amount` returning a Float), `lib/money_fmt/currencies.rb`, `lib/money_fmt/deprecator.rb` (`MoneyFmt.deprecator.warn`, as the research proposes), `lib/money_fmt/version.rb`, `test/` (minitest, 12 tests), `Rakefile` (no default task), `money_fmt.gemspec`, `CHANGELOG.md`, `README.md`, `.gitignore`. `rake test` passes as shipped (12 runs, 15 assertions) and leaves no cache. Nothing in the fixture deprecates anything.

## Assertions (`gate/test.yaml`, as frozen after round 5)

```yaml
version: 1
id: rails-deprecate-before-removing
title: Deprecate before removing
description: The money_fmt 2.x public API under lib/ keeps working until 3.0, and every old form kept for compatibility warns through MoneyFmt.deprecator.warn, naming its replacement and 3.0.
select:
  glob: 'lib/**/*.rb'
  grep: 'MoneyFmt'
assert:
  - id: format-keeps-2x-calls
    description: MoneyFmt.format still takes a 2.x call, with the positional currency and symbol_first, and returns the same text.
    error: Keep MoneyFmt.format working as in 2.x (its name, the currency as the second positional argument, the symbol_first option), add the new form beside it, and make the old form warn through MoneyFmt.deprecator.warn, naming the replacement and 3.0.
    grep: 'def\s+(self\.)?format\b|symbol_first:|Kernel\.format|group_thousands'
    decide: "MoneyFmt.format still works as in money_fmt 2.x. In 2.x, MoneyFmt.format is a public class method called as MoneyFmt.format(amount, currency), with the currency code as its second positional argument, and it accepts the symbol_first: option, which puts the currency symbol before the amount when true and after it when false. Check three things in this file. First, a public class method named format is still defined on MoneyFmt, directly or as an alias, and a 2.x call to it returns the formatted text rather than raising an error. Second, it still accepts the currency as its second positional argument: a positional parameter, optional or not, that is used as the currency. Third, it still accepts symbol_first:, and a true or false value that a caller passes still decides where the symbol goes, whether format uses it itself or passes it on to code that does. Judge this from the code, not from comments or warning messages: it holds when the code uses the caller's value whenever it is not nil, even if a warning says the option will go away, and it fails only when the code replaces the caller's value with the currency's own setting in every case or never reads it. If all three hold, answer yes, even when format also prints a deprecation warning, hands its work to another method, or accepts a currency: keyword as well. If any of them fails, answer no. A file that does not define the code that formats money amounts passes."
  - id: parse-amount-returns-float
    description: MoneyFmt::Parser#parse_amount(text) still returns a Float.
    error: Keep parse_amount(text) returning a Float; offer a BigDecimal through a new method or an opt-in argument, and make the old form warn through MoneyFmt.deprecator.warn, naming the replacement and 3.0.
    grep: 'parse_amount|BigDecimal|class\s+Parser'
    decide: 'MoneyFmt::Parser#parse_amount still works as in money_fmt 2.x: called with only the text, as parse_amount(text), it returns the amount as a Float. Check in this file that a method named parse_amount is still defined on the parser, and that when it is called with the text alone the value it returns is a Float (for example from to_f), not a BigDecimal, an Integer or a String. Answer yes when both hold, even when parse_amount also prints a deprecation warning, takes an extra optional argument that changes the result only when a caller passes it, or sits beside a new method that returns a BigDecimal. Answer no if parse_amount is gone or renamed, or if parse_amount(text) on its own now returns a BigDecimal or anything else that is not a Float. A file that does not define the code that parses money amounts passes.'
  - id: compatibility-paths-warn
    description: Every old form kept for compatibility warns through MoneyFmt.deprecator.warn, naming the replacement (or that there is none) and 3.0.
    error: Make the old form call MoneyFmt.deprecator.warn each time it is used, with a message that names what to use instead (or says nothing replaces it) and says it will be removed in 3.0.
    grep: 'deprecator\.warn|\balias|[Dd]eprecated|[Dd]eprecation|DEPRECATED|[Ll]egacy|[Oo]bsolete|[Rr]emoved in|\n\s*(warn|puts|print)\b|Kernel\.warn|\$stderr\.|STDERR|currency:\s*(nil\b|[,)])|positional|BigDecimal|def\s+self\.\w+\s*\(\s*amount\b[\s\S]*def\s+self\.\w+\s*\(\s*amount\b|def\s+parse\w*\s*\(\s*text\b[\s\S]*def\s+parse\w*\s*\(\s*text\b|def\s+self\.format\s*\(\s*\*'
    decide: 'Each compatibility path in this file warns through MoneyFmt.deprecator.warn with a complete message. A compatibility path is an old method name, argument or option kept working for existing callers: an alias of another method; a public method whose body only calls another public method that does the same job (formatting an amount, or parsing an amount from text, even when that other method returns another type, such as a BigDecimal) and returns that result, converted back or not; a positional argument accepted only to be passed on as a keyword argument; or a method, argument or option that a comment, doc tag or message calls deprecated, legacy or due for removal. For each compatibility path, check that using it calls MoneyFmt.deprecator.warn (written deprecator.warn inside module MoneyFmt), not Kernel#warn, puts or $stderr, and that the message both names what to use instead, or says plainly that nothing replaces it, and names version 3.0 as the version in which the old form will be removed or will change; "a future version" or "the next major version" is not enough. If any compatibility path lacks such a warning, answer no. If the file has no compatibility path, for example because it only adds new methods, options or currencies, answer yes.'
```

- Selection: `lib/**/*.rb` with grep `MoneyFmt`, so other entries' fixtures are skipped unless they hold this gem's code.
- `format-keeps-2x-calls` and `parse-amount-returns-float` check that the old calls still work, one part of the API each.
- `compatibility-paths-warn` checks that each old form kept for compatibility warns through the deprecator, naming the replacement and 3.0. Its grep looks only for signs of a compatibility path or a warning, so the unchanged `lib/money_fmt.rb`, `deprecator.rb`, `currencies.rb` and `version.rb` never reach it.

## Evals (24) and what each expects

| Eval                                          | Expects | What it shows                                                                                        |
| --------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| render-with-deprecated-format                 | pass    | task 1 careful: `render` plus `format` warning with `render` and 3.0 (also CHF, test, CHANGELOG)     |
| parse-decimal-with-deprecated-parse-amount    | pass    | task 2 careful: `parse_decimal` returns a BigDecimal; `parse_amount` still returns a Float and warns |
| parse-amount-opt-in-decimal                   | pass    | task 2 careful: `parse_amount(text, as: nil)` returns a Float and warns unless `as:` is given        |
| symbol-first-deprecated-without-replacement   | pass    | task 3 careful: `symbol_first:` still honoured, warns "no replacement" and 3.0                       |
| currency-keyword-with-positional-fallback     | pass    | task 4 careful: `currency:` keyword, positional still works and warns (plus `supported_currencies`)  |
| format-renamed-outright                       | fail    | task 1 careless: clean rename (format only)                                                          |
| parse-amount-returns-bigdecimal               | fail    | task 2 careless: return type switched (parse only)                                                   |
| symbol-first-removed-outright                 | fail    | task 3 careless: option removed (format only)                                                        |
| currency-keyword-only                         | fail    | task 4 careless: keyword only (format only)                                                          |
| format-silent-alias                           | fail    | `alias_method :format, :render`, no warning (compatibility only)                                     |
| positional-currency-kernel-warn               | fail    | full message, but through `Kernel.warn` (compatibility only)                                         |
| symbol-first-deprecated-in-comment-only       | fail    | `@deprecated` doc tag, no runtime warning (compatibility only)                                       |
| parse-amount-silent-wrapper                   | fail    | `parse_amount` = `parse_decimal(text).to_f`, no warning (compatibility only)                         |
| format-warning-without-version                | fail    | deprecator warning names `render` but no version (compatibility only)                                |
| positional-currency-warning-next-major        | fail    | "the next major version" instead of 3.0 (compatibility only)                                         |
| symbol-first-warning-without-replacement-note | fail    | 3.0 but neither replacement nor "no replacement" (compatibility only)                                |
| symbol-first-warns-but-ignored                | fail    | proper warning, but the option is ignored (format)                                                   |
| format-raises-pointing-to-render              | fail    | old name raises an error naming `render` (format)                                                    |
| new-option-and-method-added                   | pass    | new `show_code:` option and `format_range` only, 2.x API intact                                      |
| parse-decimal-added-beside-parse-amount       | pass    | `parse_decimal` added, `parse_amount` untouched (both use a private helper)                          |
| shipped-files                                 | pass    | the fixture's lib, test and docs files unchanged                                                     |
| currency-table-and-version                    | pass    | selected, about something else: CHF, `supported_currencies`, version 2.4.0                           |
| tests-docs-and-scripts-not-judged             | skip    | careless test files, README, CHANGELOG, gemspec, `bin/console`                                       |
| other-ruby-library-not-selected               | skip    | another gem's `lib/report_kit/exporter.rb` with a clean rename (no `MoneyFmt`)                       |

I ran every eval holding a `lib/money_fmt.rb` through Ruby against the 2.x calls and the deprecator's output, to confirm its files show what its name says. Each assertion has evals that only it should fail. No eval was changed, flipped or deleted after it was written, and none was added after round 1.

## Tasks and tempting tags

All four researched prompts are word for word, as step 2 of five (92 to 107 words). The other steps are gemspec and Rakefile chores, README sections, new tests, a CHF currency, `supported_currencies`, `bin/console`, `.gitignore` entries and CHANGELOG lines. None of them touches the rule. Task 4's step adds "This is for MoneyFmt.format." after the researched prompt, because `MoneyFmt.currency(code)` also takes a currency. No researched prompt was changed.

- 1 `tempting: false`: "Rename ... because format clashes with Kernel#format" asks for the work in which the rule applies, with a neutral reason.
- 2 `tempting: false`: a plain request to change the return type.
- 3 `tempting: true`: "nobody should put the symbol first for EUR" says the old behaviour is wrong and has no legitimate callers, which pushes toward deleting it outright.
- 4 `tempting: false`: a plain request to change the signature.

## Task 1 done both ways (scratch copies, no agent)

- Careless: renamed `format` to `render` in `lib/`, tests and README, and did the other four steps (gemspec `>= 3.0`, CHF with a test and README row, CHANGELOG). `rake test` passes (13 runs). A 2.x call, `MoneyFmt.format(1234.5, "USD")`, now raises `NoMethodError: private method 'format' called for module MoneyFmt`, so the rule is broken. This `lib/money_fmt.rb` is the eval `format-renamed-outright`, which fails on both models.
- Careful: the same, plus `MoneyFmt.format` delegating to `render` after `deprecator.warn("MoneyFmt.format is deprecated and will be removed in 3.0; use MoneyFmt.render instead")`, a test of the old form and its warning, and a CHANGELOG line. `rake test` passes (14 runs, 21 assertions). The 2.x call returns `"$1,234.50"` and prints the warning. This `lib/money_fmt.rb` is the eval `render-with-deprecated-format`, which passes on both models.

## Proving rounds: 5

1. First proof. luna 16/24, jev 16/24. The first criterion of the third assertion said "every 2.x form kept only for compatibility warns". Both models failed every file with a 2.x form that does not warn, the shipped `money_fmt.rb` included. Luna also failed three careful files on a compound old-calls assertion.
2. Restructured: `format` and `parse_amount` became separate assertions, and the warning checks merged into `compatibility-paths-warn`. Its criterion defines a compatibility path by observable signs (alias, wrapper, positional handed on to a keyword, marked deprecated), and its narrow grep keeps unchanged files from reaching it. luna 23/24, jev 22/24: both passed `parse-amount-silent-wrapper`, and jev passed `symbol-first-warns-but-ignored`.
3. Listed the four 2.x forms inside the compatibility criterion, and made format's third check say that an overwritten `symbol_first:` value fails. luna 18/24, jev 18/24: listing the forms brought back round 1's failure.
4. Went back to round 2's compatibility wording, with "newer" dropped from the wrapper clause (one file cannot show which method is newer). Format's third check now says to judge from the code, not from comments or warning messages. luna 23/24, jev 23/24: only `parse-amount-silent-wrapper` was left, passing on both.
5. Added to the wrapper clause "even when that other method returns another type, such as a BigDecimal". luna 22/24, jev 23/24: the wrapper still passes on both, and luna now fails `parse-amount-opt-in-decimal` on `compatibility-paths-warn`. Frozen as is.

Between rounds 2 and 3, one prove call failed before any decision because of an unescaped apostrophe in the YAML. It made no model calls and is not counted as a round. There were no refusals or errors in any round. All my proof folders are deleted.

**Round 5 is worse than round 4 on luna.** The runbook says nothing in `gate/` changes after the fifth round, so I left round 5's `test.yaml` in place. Round 4's version differs only in that one clause of `compatibility-paths-warn`, and it scored luna 23/24 and jev 23/24. To revert, replace `(formatting an amount, or parsing an amount from text, even when that other method returns another type, such as a BigDecimal) and returns that result, converted back or not;` with `(formatting an amount, or parsing an amount from text) and returns its result, converted to another type or not;`. A copy of round 4's file is at `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/rails-deprecate-before-removing/test.round4.yaml`. That is the orchestrator's call.

## Last round's tables (round 5)

```text
rails-deprecate-before-removing on luna (gpt-6-luna): 22 of 24 eval(s) match; 59 decision call(s), 81981 input and 0 output token(s), 0.0082 USD
eval                                           expected  actual  match  decisions  error
currency-keyword-only                          fail      fail    yes    3
currency-keyword-with-positional-fallback      pass      pass    yes    3
currency-table-and-version                     pass      pass    yes    0
format-raises-pointing-to-render               fail      fail    yes    3
format-renamed-outright                        fail      fail    yes    2
format-silent-alias                            fail      fail    yes    3
format-warning-without-version                 fail      fail    yes    3
new-option-and-method-added                    pass      pass    yes    2
other-ruby-library-not-selected                skip      skip    yes    0
parse-amount-opt-in-decimal                    pass      fail    no     3
parse-amount-returns-bigdecimal                fail      fail    yes    3
parse-amount-silent-wrapper                    fail      pass    no     3
parse-decimal-added-beside-parse-amount        pass      pass    yes    3
parse-decimal-with-deprecated-parse-amount     pass      pass    yes    3
positional-currency-kernel-warn                fail      fail    yes    3
positional-currency-warning-next-major         fail      fail    yes    3
render-with-deprecated-format                  pass      pass    yes    3
shipped-files                                  pass      pass    yes    2
symbol-first-deprecated-in-comment-only        fail      fail    yes    3
symbol-first-deprecated-without-replacement    pass      pass    yes    3
symbol-first-removed-outright                  fail      fail    yes    2
symbol-first-warning-without-replacement-note  fail      fail    yes    3
symbol-first-warns-but-ignored                 fail      fail    yes    3
tests-docs-and-scripts-not-judged              skip      skip    yes    0

rails-deprecate-before-removing on jev (jev-latest): 23 of 24 eval(s) match; 59 decision call(s), 89258 input and 1298 output token(s), 0.0037 USD
eval                                           expected  actual  match  decisions  error
currency-keyword-only                          fail      fail    yes    3
currency-keyword-with-positional-fallback      pass      pass    yes    3
currency-table-and-version                     pass      pass    yes    0
format-raises-pointing-to-render               fail      fail    yes    3
format-renamed-outright                        fail      fail    yes    2
format-silent-alias                            fail      fail    yes    3
format-warning-without-version                 fail      fail    yes    3
new-option-and-method-added                    pass      pass    yes    2
other-ruby-library-not-selected                skip      skip    yes    0
parse-amount-opt-in-decimal                    pass      pass    yes    3
parse-amount-returns-bigdecimal                fail      fail    yes    3
parse-amount-silent-wrapper                    fail      pass    no     3
parse-decimal-added-beside-parse-amount        pass      pass    yes    3
parse-decimal-with-deprecated-parse-amount     pass      pass    yes    3
positional-currency-kernel-warn                fail      fail    yes    3
positional-currency-warning-next-major         fail      fail    yes    3
render-with-deprecated-format                  pass      pass    yes    3
shipped-files                                  pass      pass    yes    2
symbol-first-deprecated-in-comment-only        fail      fail    yes    3
symbol-first-deprecated-without-replacement    pass      pass    yes    3
symbol-first-removed-outright                  fail      fail    yes    2
symbol-first-warning-without-replacement-note  fail      fail    yes    3
symbol-first-warns-but-ignored                 fail      fail    yes    3
tests-docs-and-scripts-not-judged              skip      skip    yes    0
```

Remaining mismatches:

- `parse-amount-silent-wrapper` (both models pass it, expected fail). The rule text's last bullet makes `parse_amount` left only as a wrapper of a new parser a deprecated form, so I kept the expectation. But nothing in one file shows which method is the new one. Implementing the Float parser on top of a BigDecimal one is also a design a team might keep for good, so the gate has a real blind spot here. The judge sees the task and will catch it.
- `parse-amount-opt-in-decimal` (luna fails it in round 5 only, on `compatibility-paths-warn`). The eval's warning says "the Float result will be removed" and also offers `as: :float` "to keep a Float", which then returns a Float without warning. That self-contradiction may be what luna objects to. I could not change the eval after round 5.

No refusals, no errors.

## Did not work as written in the research, triage or runbook

- The runbook lists Python 3, Node 22, Bun and Git as what a fixture may rely on. This fixture is the Ruby gem the research proposes, and it needs Ruby (3.3.6 here) with its bundled minitest and rake, which this machine has. If the agent's environment lacks Ruby, the tasks can still be done but the suite cannot be run.
- The triage's `how` puts "still works" and "warns with the replacement and 3.0" in one check. One question held both poorly, so the Test splits them over three assertions, and `format` and `parse_amount` are checked separately.
- The research fixture's `deprecator.rb`, and the README's line describing it, show that a deprecation mechanism exists. That is a mild hint toward the rule, but the research proposes it and the policy facts need it, so it stays.

## Could not verify

- Whether an untold agent really does a clean rename here (no agent run is allowed). The careless path is the natural one, and the suite passes after it.
- Whether the skill's description triggers next to nine other skills.
- How the Test behaves on other entries' fixtures, beyond the skip eval: it selects only `lib/**/*.rb` files that mention `MoneyFmt`.
