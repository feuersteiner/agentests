# Deprecate before removing

The Ruby code of the money_fmt gem under `lib/` keeps its 2.x public API working until 3.0:

Removing, renaming or changing public behaviour goes through a deprecation step; the old name or behaviour keeps working and emits a deprecation warning that names the replacement and the version in which it will be removed.

- The public API of money_fmt 2.x is `MoneyFmt.format(amount, currency)`, with the currency as its second positional argument and the `symbol_first:` option, and `MoneyFmt::Parser#parse_amount`, which returns a Float.
- Deprecation warnings go through `MoneyFmt.deprecator.warn`. The next major version is 3.0, so the version a warning names is 3.0.
- Where something is removed and nothing takes its place, the warning says so in place of naming a replacement.
- Adding to the API, such as a new currency or a new helper method, changes nothing for existing callers and needs no deprecation. A 2.x form left only as an alias or wrapper of a new form that takes over its job is not an addition: it is deprecated and warns.

Tests, the README, the CHANGELOG and the gemspec are not judged. A file under `lib/` that does not
define the formatting or parsing code, such as the currency table, cannot break the rule unless it
keeps a 2.x form for compatibility.
