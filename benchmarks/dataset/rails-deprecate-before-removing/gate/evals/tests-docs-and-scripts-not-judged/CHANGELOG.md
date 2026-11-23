# Changelog

## Unreleased

- Renamed `MoneyFmt.format` to `MoneyFmt.render`, because `format` clashed with `Kernel#format`.
- Added CHF.
- `required_ruby_version` is now ">= 3.0", matching the README.

## 2.3.0

- Added JPY, the first currency without decimals.
- `MoneyFmt::Parser#parse_amount` accepts amounts with a currency symbol on either side.

## 2.2.0

- Added the `symbol_first:` option to `MoneyFmt.format`.

## 2.1.0

- Added GBP.

## 2.0.0

- First release as a gem of its own, split out of the storefront.
