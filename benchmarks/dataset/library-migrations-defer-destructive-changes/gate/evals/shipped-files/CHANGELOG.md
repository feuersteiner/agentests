# Changelog

## Unreleased

## 3.4.0 - 2026-09-14

- Added `Shopcore::AddressLabel.lines`, which returns the lines of a shipping label.
- The orders API returns the order total as formatted text.

## 3.3.0 - 2026-06-02

- Removing an address from the address book now deletes it.

## 3.2.0 - 2026-03-10

- Added a unique `sku` to products.
- Deprecated `legacy_sku` on products in favour of `sku`. The engine no longer reads the column, and
  `Product#legacy_sku` returns `sku`.
