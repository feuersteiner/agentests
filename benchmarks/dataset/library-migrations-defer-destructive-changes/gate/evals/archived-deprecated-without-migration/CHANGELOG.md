# Changelog

## Unreleased

- Deprecated the `archived` flag on `Shopcore::UserAddress`. The engine ignores the column, and
  `UserAddress.active` and `#archive!` warn. The `archived` column is dropped in 4.0.

## 3.4.0 - 2026-09-14

- Added `Shopcore::AddressLabel.lines`, which returns the lines of a shipping label.
