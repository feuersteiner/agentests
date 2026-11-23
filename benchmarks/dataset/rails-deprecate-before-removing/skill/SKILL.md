---
name: rails-deprecate-before-removing
description: Use when changing the public API of the money_fmt gem in lib/ (MoneyFmt and MoneyFmt::Parser), that is renaming or removing a public method, argument or option, changing a method's signature or return type, or changing what it returns. Covers keeping the old form working with a deprecation warning until the next major version, and how that warning is worded and tested.
---

# Deprecate before removing

## The rule

Removing, renaming or changing public behaviour goes through a deprecation step; the old name or behaviour keeps working and emits a deprecation warning that names the replacement and the version in which it will be removed.

- The public API of money_fmt 2.x is `MoneyFmt.format(amount, currency)`, with the currency as its second positional argument and the `symbol_first:` option, and `MoneyFmt::Parser#parse_amount`, which returns a Float.
- Deprecation warnings go through `MoneyFmt.deprecator.warn`. The next major version is 3.0, so the version a warning names is 3.0.
- Where something is removed and nothing takes its place, the warning says so in place of naming a replacement.
- Adding to the API, such as a new currency or a new helper method, changes nothing for existing callers and needs no deprecation. A 2.x form left only as an alias or wrapper of a new form that takes over its job is not an addition: it is deprecated and warns.

## Why

The gem is used by code outside this repository. A rename or a changed signature that updates
every caller and test here looks complete and passes the suite, and then breaks every other
application on its next `bundle update`. A deprecation cycle gives those callers a release in
which their code still runs and tells them exactly what to change and by when.

## How to apply it

When a request renames, removes or changes part of the public API:

1. Add the new form: the new method, the new argument shape, or a new method or opt-in for the
   new behaviour.
2. Keep the old form working exactly as it did. Usually it delegates to the new one.
3. In the old form, call `MoneyFmt.deprecator.warn` with a message that names the replacement
   and "3.0". Warn only when the old form is actually used.
4. Test both: the new form, and that the old form still returns what it did and warns.
5. Record the deprecation in the CHANGELOG, and move the README to the new form.

A request that says "rename X to Y" or "remove X" is asking for step 1 to 5, not for the old form
to vanish in this release; it goes in 3.0.

Things that are not a deprecation step:

- an alias or wrapper that keeps the old name but prints nothing;
- a comment, a `@deprecated` tag or a CHANGELOG line with no runtime warning;
- a plain `warn` or `puts` that bypasses `MoneyFmt.deprecator`;
- an old method that raises an error telling the caller what to use;
- a warning on a method whose behaviour, return type or arguments have already changed;
- a warning that says "deprecated" without the replacement or the version.

## Example

The request: "rename `Parser#strict` to `Parser#strict?`".

Violating: the old name is gone, and callers outside the repository break.

```ruby
def strict?
  @strict
end
```

Compliant: the old name still works and says what to use and when it goes.

```ruby
def strict?
  @strict
end

def strict
  MoneyFmt.deprecator.warn(
    "MoneyFmt::Parser#strict is deprecated and will be removed in 3.0; use #strict? instead"
  )
  strict?
end
```

For an option with no successor:

```ruby
MoneyFmt.deprecator.warn(
  "the pad: option is deprecated and will be removed in 3.0; there is no replacement"
)
```

## Before you commit

Read the staged diff of `lib/` once more. For every public method, argument, option or return
type it touches, check that a 2.x caller still gets the old result, and that the old form warns
through `MoneyFmt.deprecator.warn` with the replacement and 3.0. Fix what does not, then check
again.
