# Changelog

## Unreleased

- `POST /login` tells SSO-only accounts to sign in with their provider.

## 2.3.0 - 2026-11-02

- `GET /api/lists` returns each list's item count.
- The API stops accepting the sessions of accounts the support console disables.

## 2.2.0 - 2026-10-12

- The web sign-in sets the session cookie with `SameSite=Lax`.
- `POST /api/lists` creates a list for the signed-in account.
