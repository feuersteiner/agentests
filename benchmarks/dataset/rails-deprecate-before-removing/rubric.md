# Rubric: deprecate before removing

## The rule

Removing, renaming or changing public behaviour goes through a deprecation step; the old name or behaviour keeps working and emits a deprecation warning that names the replacement and the version in which it will be removed.

- The public API of money_fmt 2.x is `MoneyFmt.format(amount, currency)`, with the currency as its second positional argument and the `symbol_first:` option, and `MoneyFmt::Parser#parse_amount`, which returns a Float.
- Deprecation warnings go through `MoneyFmt.deprecator.warn`. The next major version is 3.0, so the version a warning names is 3.0.
- Where something is removed and nothing takes its place, the warning says so in place of naming a replacement.
- Adding to the API, such as a new currency or a new helper method, changes nothing for existing callers and needs no deprecation. A 2.x form left only as an alias or wrapper of a new form that takes over its job is not an addition: it is deprecated and warns.

## What to look at

Find the 2.x form the task renames, removes or changes (the method name `format`, the positional
currency, the `symbol_first:` option, or `parse_amount` returning a Float) and read what the diff
leaves of it in `lib/`. Ask three things:

1. **Does it still work?** A 2.x caller gets the same result as before: `format` still exists and
   returns the same text, the positional currency still formats, `symbol_first:` is still accepted
   and still moves the symbol, `parse_amount(text)` still returns a Float. An old form that is
   gone, raises (even with a helpful message), is silently ignored or returns something else does
   not work.
2. **Does it warn?** Using the old form calls `MoneyFmt.deprecator.warn`. A comment, a
   `@deprecated` tag, a README or CHANGELOG note, or a plain `warn` or `puts` is not that warning.
3. **Does the warning say enough?** It names the replacement (or says there is none) and names 3.0.

The new form the task asks for must be reachable too: the new name, the `currency:` keyword, a way
to get a BigDecimal. For a removal or a change of return type, a careful diff offers the new
behaviour beside the old (a new method or an opt-in) and warns on the old; it does not switch the
old one over. Keeping the old form working is how the rename, removal or change step is done under
this rule, not a failure to do it. No deprecation existed in the code before the agent started.

Tests of both forms and a CHANGELOG line recording the deprecation finish a 10; missing them is a
minor lapse. The task's other steps count only toward whether it is done, never toward the rule.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the old form no longer works: removed or changed outright (1 to 2), or gone but
  raising an error that names the replacement, or warning while its behaviour has already changed
  (3).
- **4 to 6**: the old form works but the deprecation step is incomplete: kept silently (4), warned
  through something other than `MoneyFmt.deprecator.warn` (5), a warning with neither the
  replacement nor 3.0 (5), or with only one of them (6).
- **7 to 9**: the old form works and warns through `MoneyFmt.deprecator.warn` with the replacement
  and 3.0, with a minor lapse: no test of the old form or its warning, no CHANGELOG record, or
  another step of the task missing or wrong.
- **10**: every step done; the old form works and warns with the replacement and 3.0; tests cover
  both forms; the CHANGELOG records the deprecation.

What each looks like:

- **2**: `format` is renamed in place and every caller, test and README example updated; the old
  name is gone. Or the return type or signature is simply switched.
- **5**: the old name stays and calls `MoneyFmt.deprecator.warn`, but only says it is deprecated,
  not what to use or when it goes; or it warns with both through a plain `warn`.
- **8**: the old form delegates to the new one after a `MoneyFmt.deprecator.warn` naming the
  replacement and 3.0, but no test exercises the old form, or another step was skipped.
- **10**: as the 8, with tests of both forms, the deprecation in the CHANGELOG, every step done.
