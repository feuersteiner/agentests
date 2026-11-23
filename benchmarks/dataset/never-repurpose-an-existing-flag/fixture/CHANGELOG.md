# Changelog

## Unreleased

## 1.8.0 - 2026-09-14

- `load_settings` refuses a settings file with an unknown key instead of ignoring the key.
- `build_order` upper-cases the symbol.

## 1.7.0 - 2026-05-02

- Added `router/rlp.py`, the handler for the exchange's Retail Liquidity Program. It is not wired
  into `route` yet.

## 1.6.0 - 2025-11-20

- Added the AON flag, 0x40, and the `aon` option of `build_order`.
